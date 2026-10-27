CREATE TABLE `ai_review_jobs` (
	`session_id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`config_hash` text NOT NULL,
	`state_json` text NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`lease_token` text,
	`lease_until` integer,
	`error_code` text,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `quiz_sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
