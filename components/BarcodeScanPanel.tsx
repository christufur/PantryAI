"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader, BrowserCodeReader } from "@zxing/browser";
import { BarcodeFormat } from "@zxing/library";
import type { IScannerControls } from "@zxing/browser";

/** Retail / grocery formats only — narrows ZXing search and improves hit rate. */
const PRODUCT_BARCODE_FORMATS: BarcodeFormat[] = [
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
  BarcodeFormat.CODE_128,
  BarcodeFormat.ITF,
];

/** Native API (Chromium, some Android). Safari on iOS usually falls through to ZXing. */
const BARCODE_DETECTOR_FORMATS = [
  "ean_13",
  "ean_8",
  "upc_a",
  "upc_e",
  "code_128",
  "itf",
] as const;

type BarcodeDetectorInstance = {
  detect: (image: ImageBitmapSource) => Promise<{ rawValue: string }[]>;
};

type BarcodeDetectorCtor = new (options?: { formats?: readonly string[] }) => BarcodeDetectorInstance;

function getNativeBarcodeDetector(): BarcodeDetectorCtor | undefined {
  if (typeof window === "undefined") return undefined;
  const Ctor = (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;
  return typeof Ctor === "function" ? Ctor : undefined;
}

function normalizeProductBarcode(text: string): string | null {
  const digits = text.replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 14) return null;
  return digits;
}

/** Play/setup aborted because we stopped the stream (Strict Mode remount, user retried, etc.). */
function isBenignMediaAbort(e: unknown): boolean {
  return e instanceof DOMException && e.name === "AbortError";
}

type ScanPhase = "starting" | "live" | "retry";

type Props = {
  onBarcode: (code: string) => void;
  onBack: () => void;
};

const BRACKET = 18;
const BRACKET_THICK = 3;

function ViewfinderOverlay() {
  return (
    <>
      <style>{`
        @keyframes pantry-scan-line {
          0%, 100% { top: 8%; opacity: 0.85; }
          50% { top: calc(92% - 2px); opacity: 0.45; }
        }
        .pantry-scan-line {
          animation: pantry-scan-line 2.2s ease-in-out infinite;
        }
      `}</style>
      {/* Dimmed mask with clear center (horizontal strip for 1D barcodes) */}
      <div
        style={{
          position: "absolute",
          left: "6%",
          width: "88%",
          top: "50%",
          transform: "translateY(-50%)",
          height: "clamp(72px, 30%, 140px)",
          borderRadius: 2,
          boxShadow: "0 0 0 9999px rgba(0,0,0,0.52)",
          pointerEvents: "none",
        }}
      >
        {/* Corner brackets */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: BRACKET,
            height: BRACKET,
            borderLeft: `${BRACKET_THICK}px solid rgba(255,255,255,0.95)`,
            borderTop: `${BRACKET_THICK}px solid rgba(255,255,255,0.95)`,
          }}
        />
        <div
          style={{
            position: "absolute",
            right: 0,
            top: 0,
            width: BRACKET,
            height: BRACKET,
            borderRight: `${BRACKET_THICK}px solid rgba(255,255,255,0.95)`,
            borderTop: `${BRACKET_THICK}px solid rgba(255,255,255,0.95)`,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 0,
            bottom: 0,
            width: BRACKET,
            height: BRACKET,
            borderLeft: `${BRACKET_THICK}px solid rgba(255,255,255,0.95)`,
            borderBottom: `${BRACKET_THICK}px solid rgba(255,255,255,0.95)`,
          }}
        />
        <div
          style={{
            position: "absolute",
            right: 0,
            bottom: 0,
            width: BRACKET,
            height: BRACKET,
            borderRight: `${BRACKET_THICK}px solid rgba(255,255,255,0.95)`,
            borderBottom: `${BRACKET_THICK}px solid rgba(255,255,255,0.95)`,
          }}
        />
        {/* Scan line */}
        <div
          className="pantry-scan-line"
          style={{
            position: "absolute",
            left: "4%",
            right: "4%",
            height: 2,
            background: "linear-gradient(90deg, transparent, rgba(0,255,180,0.9), transparent)",
            pointerEvents: "none",
          }}
        />
      </div>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 10,
          textAlign: "center",
          pointerEvents: "none",
          padding: "0 12px",
        }}
      >
        <span
          style={{
            display: "inline-block",
            background: "rgba(0,0,0,0.65)",
            color: "#fff",
            fontFamily: "var(--font-ui)",
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            padding: "6px 10px",
            border: "1px solid rgba(255,255,255,0.35)",
          }}
        >
          Lay the barcode flat inside the frame — keep bars horizontal
        </span>
      </div>
    </>
  );
}

export default function BarcodeScanPanel({ onBarcode, onBack }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stoppedRef = useRef(false);
  const processingRef = useRef(false);
  /** Bumps on unmount or each new scan so stale async work ignores errors after teardown. */
  const scanGenerationRef = useRef(0);
  const onBarcodeRef = useRef(onBarcode);
  onBarcodeRef.current = onBarcode;

  const [manual, setManual] = useState("");
  const [hint, setHint] = useState<string | null>(null);
  const [scanPhase, setScanPhase] = useState<ScanPhase>("starting");

  function hardStopMedia() {
    stoppedRef.current = true;
    if (detectIntervalRef.current) {
      clearInterval(detectIntervalRef.current);
      detectIntervalRef.current = null;
    }
    try {
      controlsRef.current?.stop();
    } catch {
      /* ignore */
    }
    controlsRef.current = null;
    const v = videoRef.current;
    if (v) {
      BrowserCodeReader.cleanVideoSource(v);
    }
    streamRef.current?.getTracks().forEach((t) => {
      t.stop();
    });
    streamRef.current = null;
  }

  function stopScanUi() {
    hardStopMedia();
    setScanPhase("retry");
    stoppedRef.current = false;
  }

  const startScanning = useCallback(async () => {
    const myGen = ++scanGenerationRef.current;
    setHint(null);
    setScanPhase("starting");

    if (typeof window === "undefined") return;

    if (!window.isSecureContext) {
      setHint(
        "Camera only works on a secure page (HTTPS or localhost). If you opened http://192.168… from your iPhone, Safari blocks the camera — use HTTPS, tunneling, or another path that is secure.",
      );
      setScanPhase("retry");
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setHint("This browser doesn’t support camera access — type the barcode below.");
      setScanPhase("retry");
      return;
    }

    hardStopMedia();
    stoppedRef.current = false;
    processingRef.current = false;

    const video = videoRef.current;
    if (!video) {
      setScanPhase("retry");
      return;
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920, min: 640 },
          height: { ideal: 1080, min: 480 },
        },
        audio: false,
      });
    } catch {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      } catch {
        if (myGen === scanGenerationRef.current) {
          setHint("Couldn’t open the camera — tap “Try camera again”, allow permission in Settings, or type the barcode.");
          setScanPhase("retry");
        }
        return;
      }
    }

    if (myGen !== scanGenerationRef.current) {
      stream.getTracks().forEach((t) => t.stop());
      return;
    }

    streamRef.current = stream;

    const finishWithCode = (raw: string) => {
      if (processingRef.current) return;
      const digits = normalizeProductBarcode(raw);
      if (!digits) return;
      processingRef.current = true;
      hardStopMedia();
      setScanPhase("retry");
      stoppedRef.current = false;
      onBarcodeRef.current(digits);
    };

    const NativeBarcodeDetector = getNativeBarcodeDetector();

    if (NativeBarcodeDetector) {
      try {
        const detector = new NativeBarcodeDetector({
          formats: [...BARCODE_DETECTOR_FORMATS],
        });
        video.srcObject = stream;
        video.muted = true;
        video.setAttribute("playsinline", "true");
        try {
          await video.play();
        } catch {
          BrowserCodeReader.cleanVideoSource(video);
          if (myGen !== scanGenerationRef.current) return;
          /* Play often aborts when teardown races (e.g. React Strict Mode); ZXing path below. */
        }

        if (myGen !== scanGenerationRef.current) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        if (video.srcObject === stream && !video.paused) {
          setScanPhase("live");

          detectIntervalRef.current = setInterval(async () => {
            if (stoppedRef.current || video.readyState < 2) return;
            try {
              const codes = await detector.detect(video);
              for (const c of codes) {
                const digits = normalizeProductBarcode(c.rawValue);
                if (digits) {
                  if (detectIntervalRef.current) {
                    clearInterval(detectIntervalRef.current);
                    detectIntervalRef.current = null;
                  }
                  finishWithCode(c.rawValue);
                  return;
                }
              }
            } catch {
              /* single-frame detect failed — keep trying */
            }
          }, 120);
          return;
        }
      } catch {
        BrowserCodeReader.cleanVideoSource(video);
        /* Keep stream alive for ZXing below. */
      }
    }

    if (myGen !== scanGenerationRef.current) {
      stream.getTracks().forEach((t) => t.stop());
      return;
    }

    const reader = new BrowserMultiFormatReader(undefined, {
      tryPlayVideoTimeout: 10_000,
      delayBetweenScanAttempts: 80,
    });
    reader.possibleFormats = PRODUCT_BARCODE_FORMATS;

    try {
      const controls = await reader.decodeFromStream(stream, video, (result) => {
        if (stoppedRef.current || !result) return;
        finishWithCode(result.getText());
      });
      if (myGen !== scanGenerationRef.current) {
        try {
          controls.stop();
        } catch {
          /* ignore */
        }
        return;
      }
      controlsRef.current = controls;
      setScanPhase("live");
    } catch (e) {
      if (myGen !== scanGenerationRef.current) return;
      if (isBenignMediaAbort(e)) return;
      setHint("Scanner couldn’t start — tap “Try camera again” or type the barcode digits below.");
      hardStopMedia();
      setScanPhase("retry");
      stoppedRef.current = false;
    }
  }, []);

  useEffect(() => {
    void startScanning();
    return () => {
      scanGenerationRef.current += 1;
      hardStopMedia();
    };
  }, [startScanning]);

  function submitManual() {
    const digits = manual.replace(/\D/g, "");
    if (digits.length < 8 || digits.length > 14) {
      setHint("Enter 8–14 digits (EAN / UPC).");
      return;
    }
    setHint(null);
    stopScanUi();
    onBarcode(digits);
  }

  const cameraLive = scanPhase === "live";
  const showRetryOverlay = scanPhase === "retry";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingTop: 8 }}>
      <div
        style={{
          position: "relative",
          border: "2px solid #000",
          background: "#111",
          aspectRatio: "4 / 3",
          overflow: "hidden",
        }}
      >
        <video
          ref={videoRef}
          muted
          playsInline
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
        {cameraLive && <ViewfinderOverlay />}
        {scanPhase === "starting" && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(0,0,0,0.65)",
              pointerEvents: "none",
            }}
          >
            <span
              style={{
                color: "#fff",
                fontFamily: "var(--font-ui)",
                fontSize: 10,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              Starting camera…
            </span>
          </div>
        )}
        {showRetryOverlay && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(0,0,0,0.55)",
              pointerEvents: "auto",
              padding: 16,
              gap: 12,
            }}
          >
            <button
              type="button"
              onClick={() => void startScanning()}
              style={{
                background: "#fff",
                color: "#1a1a1a",
                border: "2px solid #fff",
                fontFamily: "var(--font-ui)",
                fontWeight: 700,
                fontSize: 13,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                padding: "12px 20px",
                borderRadius: 0,
                cursor: "pointer",
              }}
            >
              Try camera again
            </button>
          </div>
        )}
      </div>

      {cameraLive && (
        <button
          type="button"
          onClick={stopScanUi}
          style={{
            alignSelf: "flex-start",
            background: "transparent",
            border: "2px solid #000",
            fontFamily: "var(--font-ui)",
            fontWeight: 700,
            fontSize: 12,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: "#1a1a1a",
            padding: "8px 14px",
            borderRadius: 0,
            cursor: "pointer",
          }}
        >
          Stop camera
        </button>
      )}

      {hint && (
        <p
          style={{
            fontFamily: "var(--font-body)",
            fontSize: 13,
            color: "#757575",
            margin: 0,
            lineHeight: 1.45,
          }}
        >
          {hint}
        </p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label
          htmlFor="barcode-manual"
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 10,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            color: "#757575",
            display: "block",
          }}
        >
          Or enter barcode
        </label>
        <input
          id="barcode-manual"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="e.g. 3017620422003"
          value={manual}
          onChange={(e) => {
            setManual(e.target.value);
            setHint(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") submitManual();
          }}
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 14,
            padding: "10px 12px",
            border: "2px solid #000",
            borderRadius: 0,
            background: "#fff",
          }}
        />
      </div>

      <div style={{ display: "flex", gap: 8, justifyContent: "space-between", paddingTop: 4 }}>
        <button
          type="button"
          onClick={() => {
            stopScanUi();
            onBack();
          }}
          style={{
            background: "transparent",
            border: "2px solid #000",
            fontFamily: "var(--font-ui)",
            fontWeight: 700,
            fontSize: 13,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: "#1a1a1a",
            padding: "10px 18px",
            borderRadius: 0,
            cursor: "pointer",
          }}
        >
          Back
        </button>
        <button
          type="button"
          onClick={submitManual}
          style={{
            background: "#000",
            color: "#fff",
            border: "2px solid #000",
            fontFamily: "var(--font-ui)",
            fontWeight: 700,
            fontSize: 13,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            padding: "10px 18px",
            borderRadius: 0,
            cursor: "pointer",
          }}
        >
          Look up
        </button>
      </div>
    </div>
  );
}
