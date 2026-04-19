"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export default function NavBar() {
  const router = useRouter();

  return (
    <nav className="w-full border-b border-gray-100 bg-white px-6 py-3 flex items-center justify-between">
      <Link href="/" className="text-[18px] no-underline">
        <span className="font-bold text-gray-900">pantry</span>
        <span className="font-normal text-gray-400">.ai</span>
      </Link>
      <div className="flex items-center gap-2">
        <Link href="/" className="border border-gray-200 rounded-md px-3 py-1.5 text-[12px] font-medium text-gray-700 hover:bg-gray-50 no-underline">
          Pantry
        </Link>
        <Link href="/wall" className="border border-gray-200 rounded-md px-3 py-1.5 text-[12px] font-medium text-gray-700 hover:bg-gray-50 no-underline">
          Meals
        </Link>
        <Link href="/plan/new" className="border border-gray-200 rounded-md px-3 py-1.5 text-[12px] font-medium text-gray-700 hover:bg-gray-50 no-underline">
          Grocery list
        </Link>
        <button
          onClick={() => router.push("/scan")}
          className="bg-gray-900 text-white rounded-md px-3 py-1.5 text-[12px] font-medium hover:bg-gray-700"
        >
          + Add item
        </button>
      </div>
    </nav>
  );
}
