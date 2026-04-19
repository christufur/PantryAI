"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const LABEL_STYLE: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 10,
  textTransform: "uppercase",
  letterSpacing: "0.1em",
  color: "#757575",
};

const SELECT_TRIGGER_STYLE: React.CSSProperties = {
  background: "#ffffff",
  border: "2px solid #000",
  borderRadius: 0,
  fontFamily: "Inter, sans-serif",
  fontSize: 13,
};

const SELECT_CONTENT_STYLE: React.CSSProperties = {
  background: "#ffffff",
  border: "2px solid #000",
  borderRadius: 0,
};

export default function EditItemDialog({
  id,
  name,
  qty,
  unit,
  storageLocation,
  expiryDate,
  isLocal,
}: {
  id: number;
  name: string;
  qty: number;
  unit: string;
  storageLocation: string;
  expiryDate: number; // unix seconds
  isLocal: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [qtyVal, setQtyVal] = useState(String(qty));
  const [unitVal, setUnitVal] = useState(unit);
  const [locationVal, setLocationVal] = useState(storageLocation);
  const [expiryVal, setExpiryVal] = useState(
    new Date(expiryDate * 1000).toISOString().split("T")[0]
  );
  const [isLocalVal, setIsLocalVal] = useState(isLocal);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await fetch(`/api/items/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          qty: Number(qtyVal),
          unit: unitVal,
          storageLocation: locationVal,
          expiryDate: expiryVal,
          isLocal: isLocalVal,
        }),
      });
      setOpen(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          fontFamily: "Inter, sans-serif",
          fontWeight: 700,
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          padding: "6px 12px",
          border: "2px solid #000",
          background: "#fff",
          color: "#000",
          borderRadius: 0,
          cursor: "pointer",
        }}
      >
        EDIT
      </button>

      <Dialog open={open} onOpenChange={(o) => { if (!saving) setOpen(o); }}>
        <DialogContent
          className="sm:max-w-sm"
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
              EDIT · {name.toUpperCase()}
            </DialogTitle>
          </DialogHeader>

          <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingTop: 12 }}>
            {/* Qty + Unit row */}
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
                <label style={LABEL_STYLE}>QTY</label>
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  value={qtyVal}
                  onChange={(e) => setQtyVal(e.target.value)}
                  style={{
                    border: "2px solid #000",
                    padding: "8px 10px",
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 14,
                    background: "#fff",
                    color: "#000",
                    borderRadius: 0,
                    outline: "none",
                    width: "100%",
                  }}
                />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
                <label style={LABEL_STYLE}>UNIT</label>
                <Select value={unitVal} onValueChange={(v) => { if (v) setUnitVal(v); }}>
                  <SelectTrigger style={SELECT_TRIGGER_STYLE}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent style={SELECT_CONTENT_STYLE}>
                    {["each", "oz", "lb", "g", "ml"].map((u) => (
                      <SelectItem key={u} value={u}>{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Storage location */}
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={LABEL_STYLE}>STORAGE</label>
              <Select value={locationVal} onValueChange={(v) => { if (v) setLocationVal(v); }}>
                <SelectTrigger style={SELECT_TRIGGER_STYLE}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent style={SELECT_CONTENT_STYLE}>
                  <SelectItem value="fridge">Fridge</SelectItem>
                  <SelectItem value="freezer">Freezer</SelectItem>
                  <SelectItem value="pantry">Pantry</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Expiry date */}
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={LABEL_STYLE}>EXPIRES</label>
              <input
                type="date"
                value={expiryVal}
                onChange={(e) => setExpiryVal(e.target.value)}
                style={{
                  border: "2px solid #000",
                  padding: "8px 10px",
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 13,
                  background: "#fff",
                  color: "#000",
                  borderRadius: 0,
                  outline: "none",
                  width: "100%",
                }}
              />
            </div>

            {/* Locally sourced toggle */}
            <button
              type="button"
              onClick={() => setIsLocalVal(v => !v)}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 14px",
                border: `2px solid ${isLocalVal ? "#057dbc" : "#000"}`,
                background: isLocalVal ? "#057dbc" : "#fff",
                color: isLocalVal ? "#fff" : "#000",
                cursor: "pointer",
                textAlign: "left",
                width: "100%",
              }}
            >
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 18, lineHeight: 1 }}>
                {isLocalVal ? "◉" : "◎"}
              </span>
              <div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                  {isLocalVal ? "NM LOCAL" : "MARK AS LOCAL"}
                </div>
                <div style={{ fontFamily: "Lora, serif", fontSize: 12, opacity: 0.8, marginTop: 2 }}>
                  {isLocalVal ? "Sourced from a local NM producer" : "Tap if you bought this locally"}
                </div>
              </div>
            </button>

            {/* Buttons */}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", paddingTop: 4 }}>
              <button
                onClick={() => setOpen(false)}
                style={{
                  fontFamily: "Inter, sans-serif",
                  fontWeight: 700,
                  fontSize: 13,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  padding: "10px 18px",
                  border: "2px solid #000",
                  background: "transparent",
                  color: "#1a1a1a",
                  borderRadius: 0,
                  cursor: "pointer",
                }}
              >
                CANCEL
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  fontFamily: "Inter, sans-serif",
                  fontWeight: 700,
                  fontSize: 13,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  padding: "10px 18px",
                  border: "2px solid #000",
                  background: saving ? "#e2e8f0" : "#000",
                  color: saving ? "#757575" : "#fff",
                  borderRadius: 0,
                  cursor: saving ? "default" : "pointer",
                }}
              >
                {saving ? "SAVING…" : "SAVE"}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
