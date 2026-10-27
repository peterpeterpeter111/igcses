CREATE TABLE `ai_review_records` (
	`session_id` text NOT NULL,
	`step_key` text NOT NULL,
	`record_json` text NOT NULL,
	PRIMARY KEY(`session_id`, `step_key`),
	FOREIGN KEY (`session_id`) REFERENCES `ai_review_jobs`(`session_id`) ON UPDATE no action ON DELETE cascade
);
