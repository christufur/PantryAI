"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteItemButton({
  id,
  name,
}: {
  id: number;
  name: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleDelete() {
    if (pending) return;
    if (!confirm(`Remove "${name}" from the pantry?`)) return;
    setPending(true);
    try {
      const res = await fetch(`/api/items/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      router.refresh();
    } catch {
      alert("Couldn't remove that item. Try again.");
      setPending(false);
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={pending}
      title="Remove from pantry"
      aria-label={`Remove ${name}`}
      style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontWeight: 700,
        fontSize: 14,
        lineHeight: 1,
        width: 28, height: 28,
        border: "2px solid #000",
        background: pending ? "#e2e8f0" : "#fff",
        color: "#000",
        cursor: pending ? "default" : "pointer",
        padding: 0,
        flexShrink: 0,
      }}
    >
      {pending ? "…" : "×"}
    </button>
  );
}
