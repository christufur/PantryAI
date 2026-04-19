CREATE TABLE `impact_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`item_name` text NOT NULL,
	`category` text NOT NULL DEFAULT 'unknown',
	`qty` real NOT NULL DEFAULT 1,
	`unit` text NOT NULL DEFAULT 'each',
	`rescued_at` integer NOT NULL DEFAULT (unixepoch())
);
