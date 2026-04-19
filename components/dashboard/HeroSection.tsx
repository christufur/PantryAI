"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Camera } from "lucide-react";

type HeroStatus = "clean" | "expiring" | "expired";

type Props = {
  status: HeroStatus;
  count: number;
  itemNames: string[];
};

export default function HeroSection({ status, count, itemNames }: Props) {
  const router = useRouter();
  const [generating, setGenerating] = useState(false);

  const headline =
    status === "clean"
      ? "Pantry's clean."
      : status === "expired"
      ? `${count} thing${count !== 1 ? "s" : ""} expired.`
      : `${count} thing${count !== 1 ? "s" : ""} expiring tonight.`;

  const headlineColor =
    status === "clean"
      ? "text-gray-900"
      : status === "expired"
      ? "text-red-700"
      : "text-amber-700";

  const subText =
    itemNames.length > 0
      ? `${itemNames.slice(0, 2).join(" and ")} need${itemNames.length === 1 ? "s" : ""} to be used — tap to see recipes`
      : "Your pantry is in great shape!";

  function handleGenerate() {
    setGenerating(true);
    router.push("/plan/new");
  }

  return (
    <section className="px-6 py-7 border-b border-gray-100">
      <p className="text-[11px] uppercase tracking-widest text-gray-400 mb-2">
        {new Date().toLocaleDateString("en-US", {
          weekday: "long",
          month: "short",
          day: "numeric",
        })}{" "}
        · Tonight
      </p>

      <h1 className={`font-serif text-[42px] font-medium leading-tight mb-1 ${headlineColor}`}>
        {headline}
      </h1>

      <p className="text-[13px] text-gray-500 mb-5">{subText}</p>

      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => router.push("/scan")}
          className="flex items-center gap-2 bg-gray-900 text-white text-[13px] rounded-md px-4 py-2 hover:bg-gray-700"
        >
          <Camera size={14} />
          Snap fridge
        </button>

        <button
          onClick={handleGenerate}
          disabled={generating}
          className="flex items-center gap-2 border border-gray-200 text-[13px] rounded-md px-4 py-2 text-gray-700 hover:bg-gray-50 disabled:opacity-60"
        >
          {generating ? (
            <>
              <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Generating...
            </>
          ) : (
            "Generate meal plan →"
          )}
        </button>

        <button
          onClick={() => router.push("/plan/new")}
          className="border border-gray-200 text-[13px] rounded-md px-4 py-2 text-gray-700 hover:bg-gray-50"
        >
          Shopping list
        </button>
      </div>
    </section>
  );
}
