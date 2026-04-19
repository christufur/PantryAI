import { sqliteTable, integer, text, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// Pantry items — the core table.
// expiry_date is computed at insert time: printed_date if the vision model
// read one, else date_added + shelf_life lookup (category, storage_location).
export const pantryItems = sqliteTable("pantry_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  category: text("category").notNull(), // e.g. "leafy_greens", "dairy_milk"
  qty: real("qty").notNull().default(1),
  unit: text("unit").notNull().default("each"), // "each" | "oz" | "lb" | "g"
  storageLocation: text("storage_location").notNull(), // "fridge" | "freezer" | "pantry"
  dateAdded: integer("date_added", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  expiryDate: integer("expiry_date", { mode: "timestamp" }).notNull(),
  sourcePhotoPath: text("source_photo_path"), // nullable — null for manual entry
  isLocal: integer("is_local", { mode: "boolean" }).notNull().default(false),
});

// Shelf-life lookup. Seeded once from FoodKeeper-style data.
// Keyed by (category, storage_location). Days = default shelf life from
// date_added when no printed date is available.
export const shelfLife = sqliteTable("shelf_life", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  category: text("category").notNull(),
  storageLocation: text("storage_location").notNull(),
  days: integer("days").notNull(),
});

// Local NM producer/alternative for a generic grocery item.
// genericName matches against pantry item names (case-insensitive contains).
export const localSwaps = sqliteTable("local_swaps", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  genericName: text("generic_name").notNull(), // "bread", "tomatoes", "milk"
  localProducer: text("local_producer").notNull(),
  product: text("product").notNull(),
  whereToBuy: text("where_to_buy").notNull(),
  notes: text("notes"),
});

// ABQ-area food banks / shelters that accept donations.
// Simple boolean flags let us filter items to appropriate orgs.
export const donationOrgs = sqliteTable("donation_orgs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  address: text("address").notNull(),
  phone: text("phone"),
  hours: text("hours"),
  acceptsPerishable: integer("accepts_perishable", { mode: "boolean" })
    .notNull()
    .default(false),
  acceptsOpened: integer("accepts_opened", { mode: "boolean" })
    .notNull()
    .default(false),
  notes: text("notes"),
});

// Persisted weekly plan. One row per (week_start, day) meal slot.
// ingredientsJson is the LLM's plan output: what's used from pantry vs bought.
export const mealsPlanned = sqliteTable("meals_planned", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  weekStart: integer("week_start", { mode: "timestamp" }).notNull(),
  dayIndex: integer("day_index").notNull(), // 0 = Monday ... 6 = Sunday
  mealName: text("meal_name").notNull(),
  servings: integer("servings").notNull().default(2),
  ingredientsJson: text("ingredients_json"), // {uses_from_pantry:[], needs_to_buy:[]}
});

// User profile — single row (id = 1), stores dietary/nutritional preferences
// that get injected into all AI prompts.
export const userProfile = sqliteTable("user_profile", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  dietary: text("dietary").notNull().default(""),        // e.g. "vegetarian,gluten-free"
  allergies: text("allergies").notNull().default(""),    // e.g. "nuts, shellfish"
  nutritionalGoals: text("nutritional_goals").notNull().default(""), // e.g. "high-protein,low-sodium"
  householdSize: integer("household_size").notNull().default(2),
  cookingSkill: text("cooking_skill").notNull().default("intermediate"),
  aboutMe: text("about_me").notNull().default(""),       // free-form context
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// Recipe cache. Keyed by a hash of the sorted ingredient list.
// Saves API calls on repeat demos and keeps the pitch snappy.
export const recipesCache = sqliteTable("recipes_cache", {
  ingredientsHash: text("ingredients_hash").primaryKey(),
  recipeJson: text("recipe_json").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});