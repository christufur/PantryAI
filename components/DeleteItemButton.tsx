"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";

export default function DeleteItemButton({
  id,
  name,
}: {
  id: number;
  name: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !pending) setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, pending]);

  function openDialog() {
    setError(null);
    setOpen(true);
  }

  async function confirmRemove() {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/items/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      setOpen(false);
      router.refresh();
    } catch {
      setError("Couldn't remove that item. Try again.");
    } finally {
      setPending(false);
    }
  }

  const btnBase: CSSProperties = {
    fontFamily: "Inter, sans-serif",
    fontWeight: 700,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    padding: "10px 18px",
    border: "2px solid #000",
    cursor: pending ? "default" : "pointer",
    borderRadius: 0,
  };

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        disabled={pending && !open}
        title="Remove from pantry"
        aria-label={`Remove ${name}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        style={{
          fontFamily: "Inter, sans-serif",
          fontWeight: 700,
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          padding: "6px 12px",
          border: "2px solid #000",
          background: pending && !open ? "#e2e8f0" : "#fff",
          color: "#000",
          cursor: pending && !open ? "default" : "pointer",
          flexShrink: 0,
          whiteSpace: "nowrap",
          lineHeight: 1.2,
        }}
      >
        {pending && !open ? (
          "…"
        ) : (
          <span style={{ fontSize: 14, lineHeight: 1, display: "inline-block" }}>×</span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-item-title"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            background: "rgba(0,0,0,0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
          onClick={() => {
            if (!pending) setOpen(false);
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "var(--paper)",
              border: "2px solid #000",
              maxWidth: 420,
              width: "100%",
              padding: 24,
              boxShadow: "8px 8px 0 rgba(0,0,0,0.12)",
            }}
          >
            <div
              id="delete-item-title"
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                color: "var(--caption)",
                marginBottom: 12,
              }}
            >
              Remove from pantry
            </div>
            <p
              style={{
                fontFamily: "'Source Serif 4', serif",
                fontSize: 20,
                fontWeight: 600,
                color: "#000",
                margin: "0 0 20px",
                lineHeight: 1.25,
              }}
            >
              Remove &ldquo;{name}&rdquo;?
            </p>
            {error && (
              <p
                style={{
                  fontFamily: "Lora, serif",
                  fontSize: 14,
                  color: "#c8102e",
                  border: "1px solid #c8102e",
                  padding: "10px 12px",
                  margin: "0 0 16px",
                }}
              >
                {error}
              </p>
            )}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
              <button
                type="button"
                disabled={pending}
                onClick={() => setOpen(false)}
                style={{
                  ...btnBase,
                  background: "#fff",
                  color: "#000",
                  opacity: pending ? 0.5 : 1,
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={confirmRemove}
                style={{
                  ...btnBase,
                  background: pending ? "#e2e8f0" : "#000",
                  color: pending ? "#757575" : "#fff",
                  borderColor: "#000",
                }}
              >
                {pending ? "Removing…" : "Remove"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
