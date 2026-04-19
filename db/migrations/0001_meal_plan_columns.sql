ALTER TABLE `meals_planned` ADD COLUMN `plan_id` integer NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `meals_planned` ADD COLUMN `meal_type` text NOT NULL DEFAULT 'dinner';
--> statement-breakpoint
ALTER TABLE `meals_planned` ADD COLUMN `estimated_calories` integer;
