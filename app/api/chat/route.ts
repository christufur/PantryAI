import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { pantryItems } from "@/db/schema";
import { asc } from "drizzle-orm";
import { GoogleGenAI } from "@google/genai";

export async function POST(req: NextRequest) {
  const { message, history } = await req.json() as {
    message: string;
    history: { role: "user" | "assistant"; content: string }[];
  };

  const items = db.select().from(pantryItems).orderBy(asc(pantryItems.expiryDate)).all();
  const now = Date.now();
  const pantryContext =
    items.length === 0
      ? "The pantry is empty — no items have been scanned yet."
      : items
          .map((item) => {
            const days = Math.floor(
              (item.expiryDate.getTime() - now) / 86400000
            );
            const status =
              days < 0
                ? "EXPIRED"
                : days <= 3
                ? `DYING (${days}d left)`
                : `${days}d left`;
            return `- ${item.name}: ${item.qty} ${item.unit}, ${item.storageLocation}, ${status}`;
          })
          .join("\n");

  const systemPrompt = `You are a pantry tracking assistant called PantryOS. You know every item in the fridge/pantry. Be direct, efficient, and slightly dry-witted. Keep replies SHORT — 2 sentences max unless giving a recipe.

When asked what to cook, always prioritize DYING items (≤3 days). When giving a recipe, use this format: dish name, then numbered steps of max 8 words each, then a one-line "Saves: [items]" note.

Current pantry:
${pantryContext}

If pantry is empty, tell them to snap a photo first.`;

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({
      reply: "I'm unplugged right now. Set GEMINI_API_KEY to wake me up.",
    });
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        ...history.map((h) => ({
          role: h.role === "assistant" ? "model" : "user",
          parts: [{ text: h.content }],
        })),
        { role: "user", parts: [{ text: message }] },
      ],
      config: { systemInstruction: systemPrompt },
    });
    return NextResponse.json({ reply: response.text });
  } catch (err) {
    console.error("Gemini error:", err);
    return NextResponse.json(
      { reply: "Something went wrong on my end. Try again?" },
      { status: 500 }
    );
  }
}
