CREATE TABLE `donation_orgs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`address` text NOT NULL,
	`phone` text,
	`hours` text,
	`accepts_perishable` integer DEFAULT false NOT NULL,
	`accepts_opened` integer DEFAULT false NOT NULL,
	`notes` text
);
--> statement-breakpoint
CREATE TABLE `local_swaps` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`generic_name` text NOT NULL,
	`local_producer` text NOT NULL,
	`product` text NOT NULL,
	`where_to_buy` text NOT NULL,
	`notes` text
);
--> statement-breakpoint
CREATE TABLE `meals_planned` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`week_start` integer NOT NULL,
	`day_index` integer NOT NULL,
	`meal_name` text NOT NULL,
	`servings` integer DEFAULT 2 NOT NULL,
	`ingredients_json` text
);
--> statement-breakpoint
CREATE TABLE `pantry_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`qty` real DEFAULT 1 NOT NULL,
	`unit` text DEFAULT 'each' NOT NULL,
	`storage_location` text NOT NULL,
	`date_added` integer DEFAULT (unixepoch()) NOT NULL,
	`expiry_date` integer NOT NULL,
	`source_photo_path` text,
	`is_local` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE `recipes_cache` (
	`ingredients_hash` text PRIMARY KEY NOT NULL,
	`recipe_json` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `shelf_life` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`category` text NOT NULL,
	`storage_location` text NOT NULL,
	`days` integer NOT NULL
);
