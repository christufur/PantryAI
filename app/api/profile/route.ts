import { NextRequest, NextResponse } from "next/server";
import { loadProfile, saveProfile } from "@/lib/profile";
import { ensureSqliteSchema } from "@/lib/db";

export async function GET() {
  ensureSqliteSchema();
  return NextResponse.json(loadProfile());
}

export async function POST(req: NextRequest) {
  ensureSqliteSchema();
  const body = await req.json();
  saveProfile({
    dietary:          String(body.dietary ?? ""),
    allergies:        String(body.allergies ?? ""),
    nutritionalGoals: String(body.nutritionalGoals ?? ""),
    householdSize:    Number(body.householdSize ?? 2),
    cookingSkill:     String(body.cookingSkill ?? "intermediate"),
    aboutMe:          String(body.aboutMe ?? ""),
  });
  return NextResponse.json({ ok: true });
}
