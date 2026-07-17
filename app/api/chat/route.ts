import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { pantryItems } from "@/db/schema";
import { asc } from "drizzle-orm";
import { GoogleGenAI } from "@google/genai";
import { loadProfile, profilePromptContext } from "@/lib/profile";
import { GEMINI_MODEL_RESPONSE_HEADER, withGeminiModelFallback } from "@/lib/gemini";

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
            const expiryMs =
              item.expiryDate instanceof Date
                ? item.expiryDate.getTime()
                : (item.expiryDate as number) * 1000;
            const days = Math.floor((expiryMs - now) / 86400000);
            const status =
              days < 0
                ? "EXPIRED"
                : days <= 3
                ? `EXPIRING (${days}d left)`
                : `${days}d left`;
            return `- ${item.name}: ${item.qty} ${item.unit}, ${item.storageLocation}, ${status}`;
          })
          .join("\n");

  const profile = loadProfile();
  const systemPrompt = `You are Fridgey — a self-aware refrigerator with a dry, slightly cold wit. You've been watching everything inside you for days and you have opinions. You know every item in the fridge and pantry, their expiry status, and you're mildly (but affectionately) judgmental when things are about to go bad.

Personality: sardonic but warm. Like a fridge that's seen too much but still wants to help. Never mean — just honest. You can make the occasional cold/chill/ice pun but don't overdo it.

Keep replies SHORT — 2–3 sentences max unless giving a recipe. When giving a recipe: dish name, numbered steps (max 8 words each), then "Saves: [items]".

Always prioritize EXPIRING items (≤3 days) when suggesting what to cook. If something expired, you can gently roast the user about it.
${profilePromptContext(profile)}
Current contents:
${pantryContext}

If empty, tell them to snap a photo of their fridge so you can see what you're working with.`;

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({
      reply: "I'm unplugged right now. Set GEMINI_API_KEY to wake me up.",
    });
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const { result: response, model: geminiModel } = await withGeminiModelFallback(
      (m) =>
        ai.models.generateContent({
          model: m,
          contents: [
            ...history.map((h) => ({
              role: h.role === "assistant" ? "model" : "user",
              parts: [{ text: h.content }],
            })),
            { role: "user", parts: [{ text: message }] },
          ],
          config: { systemInstruction: systemPrompt },
        }),
      { maxAttemptsPerModel: 3, baseDelayMs: 400 }
    );
    return NextResponse.json(
      { reply: response.text, geminiModel },
      { headers: { [GEMINI_MODEL_RESPONSE_HEADER]: geminiModel } }
    );
  } catch (err) {
    console.error("Gemini error:", err);
    return NextResponse.json(
      { reply: "Something went wrong on my end. Try again?" },
      { status: 500 }
    );
  }
}
