"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { PlainItem } from "@/components/pantry-types";

const FOOD_BANKS = [
  { name: "Roadrunner Food Bank",      address: "5840 Office Blvd NE, ABQ", hours: "Mon–Fri 8am–4pm"    },
  { name: "Storehouse NM",             address: "2215 Comanche Rd NE, ABQ",  hours: "Tue & Thu 9am–12pm" },
  { name: "Matthew 25",                address: "1100 Walter St NE, ABQ",    hours: "Mon–Sat 9am–5pm"    },
  { name: "ABQ Community Fridge",      address: "@abqcommunityfridge",        hours: "24/7 drop-off"      },
];

const btnBase: React.CSSProperties = {
  fontFamily: "Inter, sans-serif",
  fontWeight: 700,
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  padding: "10px 18px",
  border: "2px solid #000",
  cursor: "pointer",
  borderRadius: 0,
};

export default function DonateModal({
  items,
  onClose,
}: {
  items: PlainItem[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "pending" | "done" | "error">("idle");

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && status !== "pending") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, status]);

  async function confirmDonate() {
    if (status === "pending") return;
    setStatus("pending");
    try {
      await Promise.all(
        items.map((item) =>
          fetch(`/api/items/${item.id}`, { method: "DELETE" }).then((r) => {
            if (!r.ok) throw new Error(`Failed to remove ${item.name}`);
          })
        )
      );
      setStatus("done");
      router.refresh();
    } catch {
      setStatus("error");
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="donate-modal-title"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={() => { if (status !== "pending") onClose(); }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--paper)",
          border: "2px solid #000",
          maxWidth: 460,
          width: "100%",
          boxShadow: "8px 8px 0 rgba(0,0,0,0.12)",
        }}
      >
        {/* Header */}
        <div style={{ borderBottom: "2px solid #000", padding: "12px 18px" }}>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10, fontWeight: 700,
            textTransform: "uppercase", letterSpacing: "0.12em",
            color: "#057dbc", marginBottom: 4,
          }}>
            ◉ DONATE TO COMMUNITY
          </div>
          <div
            id="donate-modal-title"
            style={{
              fontFamily: "'Source Serif 4', serif",
              fontSize: 20, fontWeight: 600, lineHeight: 1.2, color: "#000",
            }}
          >
            {status === "done"
              ? "Donation logged. Thank you."
              : `Donate ${items.length} expiring item${items.length !== 1 ? "s" : ""}`}
          </div>
        </div>

        <div style={{ padding: "14px 18px", display: "flex", flexDirection: "column", gap: 14 }}>

          {status !== "done" ? (
            <>
              {/* Items — inline */}
              <div>
                <div style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 9, fontWeight: 700,
                  textTransform: "uppercase", letterSpacing: "0.1em",
                  color: "var(--caption)", marginBottom: 5,
                }}>
                  Items
                </div>
                <div style={{
                  fontFamily: "Lora, serif",
                  fontSize: 13, color: "#000", lineHeight: 1.5,
                }}>
                  {items.map((item) => item.name).join(", ")}
                </div>
              </div>

              {/* Food banks — compact rows */}
              <div>
                <div style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 9, fontWeight: 700,
                  textTransform: "uppercase", letterSpacing: "0.1em",
                  color: "var(--caption)", marginBottom: 8,
                }}>
                  Drop-off locations · New Mexico
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                  {FOOD_BANKS.map((fb, i) => (
                    <div
                      key={fb.name}
                      className="donate-bank-row"
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: 12,
                        padding: "8px 0",
                        borderBottom: i < FOOD_BANKS.length - 1 ? "1px solid var(--hairline)" : "none",
                      }}
                    >
                      <div>
                        <div style={{ fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 12 }}>
                          {fb.name}
                        </div>
                        <div style={{ fontFamily: "Lora, serif", fontSize: 11, color: "var(--caption)" }}>
                          {fb.address}
                        </div>
                      </div>
                      <div className="donate-bank-hours" style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 10, color: "var(--caption)",
                        whiteSpace: "nowrap", flexShrink: 0, paddingTop: 2,
                      }}>
                        {fb.hours}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {status === "error" && (
                <p style={{
                  fontFamily: "Lora, serif", fontSize: 12,
                  color: "#c8102e", border: "1px solid #c8102e",
                  padding: "8px 10px", margin: 0,
                }}>
                  Something went wrong. Try again.
                </p>
              )}
            </>
          ) : (
            <p style={{
              fontFamily: "Lora, serif", fontSize: 14,
              color: "var(--caption)", margin: 0, lineHeight: 1.6,
            }}>
              These items have been removed from your pantry. Every donation helps reduce food waste in New Mexico.
            </p>
          )}

          <style>{`
            @media (max-width: 480px) {
              .donate-bank-row { flex-direction: column !important; gap: 2px !important; }
              .donate-bank-hours { padding-top: 0 !important; }
            }
          `}</style>

          {/* Actions */}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            {status !== "done" ? (
              <>
                <button
                  type="button"
                  disabled={status === "pending"}
                  onClick={onClose}
                  style={{ ...btnBase, background: "#fff", color: "#000", opacity: status === "pending" ? 0.5 : 1 }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={status === "pending"}
                  onClick={confirmDonate}
                  style={{
                    ...btnBase,
                    background: status === "pending" ? "#e2e8f0" : "#057dbc",
                    color: status === "pending" ? "#757575" : "#fff",
                    borderColor: status === "pending" ? "#e2e8f0" : "#057dbc",
                  }}
                >
                  {status === "pending" ? "Marking donated…" : `Mark ${items.length} as donated`}
                </button>
              </>
            ) : (
              <button type="button" onClick={onClose} style={{ ...btnBase, background: "#000", color: "#fff" }}>
                Close
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
