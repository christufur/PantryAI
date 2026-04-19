import { db, ensureSqliteSchema } from "@/lib/db";
import { userProfile } from "@/db/schema";

export type UserProfile = {
  dietary: string;
  allergies: string;
  nutritionalGoals: string;
  householdSize: number;
  cookingSkill: string;
  aboutMe: string;
};

export const DEFAULT_PROFILE: UserProfile = {
  dietary: "",
  allergies: "",
  nutritionalGoals: "",
  householdSize: 2,
  cookingSkill: "intermediate",
  aboutMe: "",
};

export function loadProfile(): UserProfile {
  ensureSqliteSchema();
  const row = db.select().from(userProfile).get();
  if (!row) return DEFAULT_PROFILE;
  return {
    dietary: row.dietary,
    allergies: row.allergies,
    nutritionalGoals: row.nutritionalGoals,
    householdSize: row.householdSize,
    cookingSkill: row.cookingSkill,
    aboutMe: row.aboutMe,
  };
}

export function saveProfile(p: UserProfile): void {
  ensureSqliteSchema();
  const existing = db.select().from(userProfile).get();
  if (existing) {
    db.update(userProfile).set({ ...p, updatedAt: new Date() }).run();
  } else {
    db.insert(userProfile).values({ ...p }).run();
  }
}

/** Format profile as a concise prompt snippet injected into AI calls. */
export function profilePromptContext(p: UserProfile): string {
  const lines: string[] = [];
  if (p.dietary) lines.push(`Dietary restrictions: ${p.dietary}`);
  if (p.allergies) lines.push(`Allergies / must avoid: ${p.allergies}`);
  if (p.nutritionalGoals) lines.push(`Nutritional goals: ${p.nutritionalGoals}`);
  if (p.householdSize) lines.push(`Cooking for: ${p.householdSize} person${p.householdSize !== 1 ? "s" : ""}`);
  if (p.cookingSkill && p.cookingSkill !== "intermediate") lines.push(`Cooking skill: ${p.cookingSkill}`);
  if (p.aboutMe) lines.push(`Additional context: ${p.aboutMe}`);
  if (lines.length === 0) return "";
  return `\nUSER PROFILE:\n${lines.join("\n")}\n`;
}

/** Stable hash of the profile for cache-busting recipe results when prefs change. */
export function profileHash(p: UserProfile): string {
  return [p.dietary, p.allergies, p.nutritionalGoals, p.householdSize, p.cookingSkill, p.aboutMe]
    .join("|")
    .toLowerCase();
}
