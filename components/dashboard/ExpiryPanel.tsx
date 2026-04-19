"use client";

import { useState } from "react";
import { Heart } from "lucide-react";

type Urgency = "today" | "soon" | "ok";

export type ExpiryItem = {
  name: string;
  urgency: Urgency;
  label: string;
};

type Props = {
  items: ExpiryItem[];
};

const pillClass: Record<Urgency, string> = {
  today: "bg-red-100 text-red-700",
  soon:  "bg-amber-100 text-amber-700",
  ok:    "bg-green-100 text-green-700",
};

export default function ExpiryPanel({ items }: Props) {
  const [donated, setDonated] = useState(false);

  return (
    <div className="p-4 border-r border-gray-100 h-full">
      <p className="text-[11px] uppercase tracking-widest text-gray-400 mb-3">Expiring soon</p>

      <div className="flex flex-col">
        {items.map((item, i) => (
          <div
            key={i}
            className={`flex items-center justify-between py-2.5 ${
              i < items.length - 1 ? "border-b border-gray-100" : ""
            }`}
          >
            <span className="text-[13px] text-gray-800">{item.name}</span>
            <span className={`text-[11px] rounded-md px-2 py-0.5 font-medium ${pillClass[item.urgency]}`}>
              {item.label}
            </span>
          </div>
        ))}
      </div>

      <button
        onClick={() => setDonated((d) => !d)}
        className={`mt-4 w-full flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2.5 text-[12px] text-gray-500 hover:bg-gray-100 transition-opacity text-left ${
          donated ? "opacity-50" : ""
        }`}
      >
        <Heart
          size={13}
          className={donated ? "text-red-500 fill-red-500 shrink-0" : "text-gray-400 shrink-0"}
        />
        <span>
          {donated
            ? "✓ Items marked for donation"
            : "Mark expired items for donation instead of trash"}
        </span>
      </button>
    </div>
  );
}
