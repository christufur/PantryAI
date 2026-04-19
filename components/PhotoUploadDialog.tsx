"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import BarcodeScanPanel from "@/components/BarcodeScanPanel";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface IdentifiedItem {
  id?: number;
  name: string;
  category: string;
  expiryDate: number | string;
  qty?: number;
  unit?: string;
}

interface ApiResponse {
  items?: IdentifiedItem[];
  error?: string;
}

type DialogState = "pick" | "scan" | "loading" | "receipt";
type LoadingSource = "photo" | "barcode";

export default function PhotoUploadDialog({
  fullWidthTrigger = false,
  triggerVariant = "solid",
}: {
  /** Wider tap target on narrow screens (e.g. top-of-page mobile CTA). */
  fullWidthTrigger?: boolean;
  /** `outline` reads on `--paper` and avoids stacking two solid black bars under the ribbon. */
  triggerVariant?: "solid" | "outline";
} = {}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [dialogState, setDialogState] = useState<DialogState>("pick");
  const [file, setFile] = useState<File | null>(null);
  const [storageLocation, setStorageLocation] = useState("fridge");
  const [identifiedItems, setIdentifiedItems] = useState<IdentifiedItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loadingSource, setLoadingSource] = useState<LoadingSource>("photo");
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  function resetState() {
    setFile(null);
    setStorageLocation("fridge");
    setDialogState("pick");
    setIdentifiedItems([]);
    setError(null);
    if (galleryInputRef.current) galleryInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  }

  function onImageChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.files?.[0] ?? null;
    setFile(next);
    setError(null);
    e.target.value = "";
  }

  async function handleSubmit() {
    if (!file) return;
    setLoadingSource("photo");
    setDialogState("loading");
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("storageLocation", storageLocation);
      const res = await fetch("/api/photo", { method: "POST", body: form });
      let data: ApiResponse | IdentifiedItem[];
      try {
        data = await res.json();
      } catch {
        setError(
          res.ok
            ? "Unexpected response from the server."
            : "Something went wrong. Please try again."
        );
        setDialogState("pick");
        return;
      }
      if (!res.ok) {
        const err = !Array.isArray(data) ? data.error : undefined;
        setError(err ?? "Something went wrong. Please try again.");
        setDialogState("pick");
      } else {
        const items = Array.isArray(data) ? data : data.items ?? [];
        setIdentifiedItems(items);
        setDialogState("receipt");
      }
    } catch {
      setError("Network error — please check your connection.");
      setDialogState("pick");
    }
  }

  const handleBarcodeLookup = useCallback(
    async (code: string) => {
      setLoadingSource("barcode");
      setDialogState("loading");
      setError(null);
      try {
        const res = await fetch("/api/barcode", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ barcode: code, storageLocation }),
        });
        const data: ApiResponse | IdentifiedItem[] = await res.json();
        if (!res.ok) {
          const err = !Array.isArray(data) ? data.error : undefined;
          setError(err ?? "Lookup failed.");
          setDialogState("scan");
        } else {
          const items = Array.isArray(data) ? data : data.items ?? [];
          setIdentifiedItems(items);
          setDialogState("receipt");
        }
      } catch {
        setError("Network error — please check your connection.");
        setDialogState("scan");
      }
    },
    [storageLocation]
  );

  function handleDone() {
    router.refresh();
    setOpen(false);
    resetState();
  }

  function handleCookSomething() {
    router.push("/recipe?ingredients=" + identifiedItems.map((i) => i.name).join(","));
  }

  function getExpiryDays(item: IdentifiedItem): number {
    if (!item.expiryDate) return 999;
    const ts =
      typeof item.expiryDate === "number"
        ? item.expiryDate * 1000
        : new Date(item.expiryDate).getTime();
    return Math.floor((ts - Date.now()) / 86400000);
  }

  return (
    <>
      <style>{`
        @keyframes ellipsis {
          0%   { content: '.'; }
          33%  { content: '..'; }
          66%  { content: '...'; }
          100% { content: '.'; }
        }
        .wired-ellipsis::after {
          content: '.';
          animation: ellipsis 1.2s steps(1, end) infinite;
        }
        @media (max-width: 600px) {
          .wired-receipt-btns {
            flex-direction: column !important;
          }
          .wired-receipt-btns button {
            width: 100% !important;
          }
        }
      `}</style>

      {/* Trigger button */}
      <button
        type="button"
        onClick={() => {
          resetState();
          setOpen(true);
        }}
        style={{
          ...(triggerVariant === "outline"
            ? {
                background: "var(--paper)",
                color: "#000",
                border: "2px solid #000",
              }
            : {
                background: "#000",
                color: "#fff",
                border: "2px solid #000",
              }),
          fontFamily: "Inter, sans-serif",
          fontWeight: 700,
          fontSize: 13,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          padding: "10px 18px",
          borderRadius: 0,
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          boxSizing: "border-box",
          width: fullWidthTrigger ? "100%" : undefined,
          minHeight: fullWidthTrigger ? 48 : undefined,
        }}
      >
        ◎ ADD FROM PHOTO
      </button>

      <Dialog
        open={open}
        onOpenChange={(o) => {
          if (dialogState !== "loading") {
            setOpen(o);
            if (!o) resetState();
          }
        }}
      >
        <DialogContent
          className="sm:max-w-md"
          style={{
            background: "#ffffff",
            border: "2px solid #000",
            borderRadius: 0,
            padding: "24px",
          }}
        >
          <DialogHeader>
            <DialogTitle
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11,
                fontWeight: 700,
                color: "#757575",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
              }}
            >
              {dialogState === "scan"
                ? "SCAN PRODUCT BARCODE"
                : dialogState === "loading" && loadingSource === "barcode"
                  ? "BARCODE LOOKUP"
                  : "IDENTIFY ITEMS VIA PHOTO"}
            </DialogTitle>
            <DialogDescription
              style={{
                fontFamily: "Lora, serif",
                color: "#757575",
                fontSize: 14,
                marginTop: 4,
              }}
            >
              {dialogState === "scan"
                ? "We look up the code in Open Food Facts (free open database) — no AI key required. Pick storage below, then scan or type the digits."
                : "Add a fridge photo from your library or use the camera, then Gemini returns structured JSON (items with categories and dates) that we turn into pantry rows. Or scan a barcode instead."}
            </DialogDescription>
          </DialogHeader>

          {/* STATE 1: Pick file */}
          {dialogState === "pick" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingTop: 8 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <span
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 10,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    color: "#757575",
                    display: "block",
                  }}
                >
                  PHOTO SOURCE
                </span>
                <input
                  ref={galleryInputRef}
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  tabIndex={-1}
                  aria-label="Choose image from photo library or files"
                  onChange={onImageChosen}
                />
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="sr-only"
                  tabIndex={-1}
                  aria-label="Take a photo with camera"
                  onChange={onImageChosen}
                />
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => galleryInputRef.current?.click()}
                    style={{
                      flex: "1 1 120px",
                      background: "#fff",
                      color: "#1a1a1a",
                      border: "2px solid #000",
                      fontFamily: "Inter, sans-serif",
                      fontWeight: 700,
                      fontSize: 12,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      padding: "10px 14px",
                      borderRadius: 0,
                      cursor: "pointer",
                    }}
                  >
                    From photos
                  </button>
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    style={{
                      flex: "1 1 120px",
                      background: "#fff",
                      color: "#1a1a1a",
                      border: "2px solid #000",
                      fontFamily: "Inter, sans-serif",
                      fontWeight: 700,
                      fontSize: 12,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      padding: "10px 14px",
                      borderRadius: 0,
                      cursor: "pointer",
                    }}
                  >
                    Use camera
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setDialogState("scan");
                    }}
                    style={{
                      flex: "1 1 120px",
                      background: "#fff",
                      color: "#1a1a1a",
                      border: "2px solid #000",
                      fontFamily: "Inter, sans-serif",
                      fontWeight: 700,
                      fontSize: 12,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      padding: "10px 14px",
                      borderRadius: 0,
                      cursor: "pointer",
                    }}
                  >
                    Scan barcode
                  </button>
                </div>
                {file && (
                  <p
                    style={{
                      fontFamily: "Inter, sans-serif",
                      fontSize: 12,
                      color: "#1a1a1a",
                      margin: 0,
                      wordBreak: "break-all",
                    }}
                  >
                    Selected: {file.name}
                  </p>
                )}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label
                  htmlFor="storage-location"
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 10,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    color: "#757575",
                    display: "block",
                  }}
                >
                  STORAGE LOCATION
                </label>
                <Select
                  value={storageLocation}
                  onValueChange={(v) => { if (v) setStorageLocation(v); }}
                >
                  <SelectTrigger
                    id="storage-location"
                    style={{
                      background: "#ffffff",
                      border: "2px solid #000",
                      borderRadius: 0,
                      fontFamily: "Inter, sans-serif",
                      fontSize: 13,
                    }}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent style={{ background: "#ffffff", border: "2px solid #000", borderRadius: 0 }}>
                    <SelectItem value="fridge">Fridge</SelectItem>
                    <SelectItem value="freezer">Freezer</SelectItem>
                    <SelectItem value="pantry">Pantry</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {error && (
                <p
                  style={{
                    fontFamily: "Lora, serif",
                    fontSize: 13,
                    color: "#c8102e",
                    border: "1px solid #c8102e",
                    padding: "8px 12px",
                  }}
                >
                  {error}
                </p>
              )}

              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", paddingTop: 4 }}>
                <button
                  onClick={() => { setOpen(false); resetState(); }}
                  style={{
                    background: "transparent",
                    border: "2px solid #000",
                    fontFamily: "Inter, sans-serif",
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
                  CANCEL
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!file}
                  style={{
                    background: file ? "#000" : "#e2e8f0",
                    color: file ? "#fff" : "#757575",
                    border: "2px solid #000",
                    fontFamily: "Inter, sans-serif",
                    fontWeight: 700,
                    fontSize: 13,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    padding: "10px 18px",
                    borderRadius: 0,
                    cursor: file ? "pointer" : "default",
                    opacity: file ? 1 : 0.6,
                  }}
                >
                  IDENTIFY ITEMS
                </button>
              </div>
            </div>
          )}

          {dialogState === "scan" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingTop: 8 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label
                  htmlFor="storage-location-scan"
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 10,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    color: "#757575",
                    display: "block",
                  }}
                >
                  STORAGE LOCATION
                </label>
                <Select
                  value={storageLocation}
                  onValueChange={(v) => {
                    if (v) setStorageLocation(v);
                  }}
                >
                  <SelectTrigger
                    id="storage-location-scan"
                    style={{
                      background: "#ffffff",
                      border: "2px solid #000",
                      borderRadius: 0,
                      fontFamily: "Inter, sans-serif",
                      fontSize: 13,
                    }}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent style={{ background: "#ffffff", border: "2px solid #000", borderRadius: 0 }}>
                    <SelectItem value="fridge">Fridge</SelectItem>
                    <SelectItem value="freezer">Freezer</SelectItem>
                    <SelectItem value="pantry">Pantry</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {error && (
                <p
                  style={{
                    fontFamily: "Lora, serif",
                    fontSize: 13,
                    color: "#c8102e",
                    border: "1px solid #c8102e",
                    padding: "8px 12px",
                    margin: 0,
                  }}
                >
                  {error}
                </p>
              )}

              <BarcodeScanPanel
                onBarcode={handleBarcodeLookup}
                onBack={() => {
                  setError(null);
                  setDialogState("pick");
                }}
              />
            </div>
          )}

          {/* STATE 2: Loading */}
          {dialogState === "loading" && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 12,
                padding: "40px 0",
              }}
            >
              <div
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#757575",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  textAlign: "center",
                }}
              >
                {loadingSource === "barcode"
                  ? "OPEN FOOD FACTS · LOOKUP"
                  : "GEMINI VISION · ANALYZING"}
              </div>
              <p
                style={{
                  fontFamily: "Lora, serif",
                  fontSize: 16,
                  color: "#1a1a1a",
                  textAlign: "center",
                  margin: 0,
                }}
              >
                {loadingSource === "barcode" ? (
                  <>
                    Resolving product<span className="wired-ellipsis" />
                  </>
                ) : (
                  <>
                    Identifying items<span className="wired-ellipsis" />
                  </>
                )}
              </p>
            </div>
          )}

          {/* STATE 3: Receipt reveal */}
          {dialogState === "receipt" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingTop: 8 }}>
              <div
                style={{
                  border: "2px solid #000",
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 11,
                  lineHeight: 1.8,
                  background: "#fafaf9",
                  padding: 16,
                  maxHeight: 280,
                  overflowY: "auto",
                }}
              >
                <div
                  style={{
                    borderBottom: "1px dashed #000",
                    paddingBottom: 6,
                    marginBottom: 6,
                    textAlign: "center",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                  }}
                >
                  ─── INVENTORY · {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }).toUpperCase()} ───
                </div>

                {identifiedItems.map((item, idx) => {
                  const d = getExpiryDays(item);
                  const dying = d <= 3;
                  return (
                    <div
                      key={item.id ?? `${item.name}-${idx}`}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        color: dying ? "#c8102e" : "#1a1a1a",
                        fontWeight: dying ? 700 : 400,
                      }}
                    >
                      <span>{item.name.toUpperCase().padEnd(18, ".")}</span>
                      <span>{d < 0 ? "EXP" : `${d}D`}{dying ? " ⚠" : ""}</span>
                    </div>
                  );
                })}

                <div
                  style={{
                    borderTop: "1px dashed #000",
                    paddingTop: 6,
                    marginTop: 6,
                    textAlign: "center",
                  }}
                >
                  ─── {identifiedItems.length} ITEMS ADDED ───
                </div>
              </div>

              <div
                className="wired-receipt-btns"
                style={{ display: "flex", gap: 8, paddingTop: 4 }}
              >
                <button
                  onClick={handleCookSomething}
                  style={{
                    background: "#000",
                    color: "#fff",
                    border: "2px solid #000",
                    fontFamily: "Inter, sans-serif",
                    fontWeight: 700,
                    fontSize: 13,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    padding: "10px 18px",
                    borderRadius: 0,
                    cursor: "pointer",
                    flex: 1,
                  }}
                >
                  COOK SOMETHING →
                </button>
                <button
                  onClick={handleDone}
                  style={{
                    background: "transparent",
                    color: "#000",
                    border: "2px solid #000",
                    fontFamily: "Inter, sans-serif",
                    fontWeight: 700,
                    fontSize: 13,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    padding: "10px 18px",
                    borderRadius: 0,
                    cursor: "pointer",
                    flex: 1,
                  }}
                >
                  DONE
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
