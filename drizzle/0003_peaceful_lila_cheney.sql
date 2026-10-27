CREATE TABLE `practice_summaries` (
	`owner_id` text NOT NULL,
	`id` text NOT NULL,
	`record_json` text NOT NULL,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`owner_id`, `id`)
);
--> statement-breakpoint
CREATE INDEX `practice_owner_updated` ON `practice_summaries` (`owner_id`,`updated_at`);--> statement-breakpoint
CREATE TABLE `student_profiles` (
	`owner_id` text PRIMARY KEY NOT NULL,
	`pseudonym` text NOT NULL,
	`updated_at` text NOT NULL
);
