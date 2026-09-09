CREATE TABLE `answers` (
	`package_id` text PRIMARY KEY NOT NULL,
	`text` text NOT NULL,
	`status` text NOT NULL,
	`revision` integer NOT NULL,
	`submission_key` text,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`package_id`) REFERENCES `question_packages`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `audit_events` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text,
	`entity_id` text NOT NULL,
	`kind` text NOT NULL,
	`details_json` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `chapters` (
	`id` text PRIMARY KEY NOT NULL,
	`subject_id` text NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`sort_order` integer NOT NULL,
	`content_json` text,
	`status` text DEFAULT 'planned' NOT NULL,
	`human_reviewed` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `chapters_subject_slug` ON `chapters` (`subject_id`,`slug`);--> statement-breakpoint
CREATE TABLE `coverage` (
	`point_id` text NOT NULL,
	`chapter_id` text NOT NULL,
	`section_id` text NOT NULL,
	`drafted` integer DEFAULT false NOT NULL,
	`source_checked` integer DEFAULT false NOT NULL,
	`human_reviewed` integer DEFAULT false NOT NULL,
	`complete` integer DEFAULT false NOT NULL,
	PRIMARY KEY(`point_id`, `chapter_id`, `section_id`),
	FOREIGN KEY (`point_id`) REFERENCES `specification_points`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`chapter_id`) REFERENCES `chapters`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `grading_revisions` (
	`id` text PRIMARY KEY NOT NULL,
	`package_id` text NOT NULL,
	`revision` integer NOT NULL,
	`earned_marks` integer NOT NULL,
	`rubric_hash` text NOT NULL,
	`model_version` text NOT NULL,
	`feedback_json` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`package_id`) REFERENCES `question_packages`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "earned_marks_range" CHECK("grading_revisions"."earned_marks" >= 0 AND "grading_revisions"."earned_marks" <= 6)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `grading_package_revision` ON `grading_revisions` (`package_id`,`revision`);--> statement-breakpoint
CREATE TABLE `question_packages` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`position` integer NOT NULL,
	`max_marks` integer NOT NULL,
	`public_json` text NOT NULL,
	`private_json` text NOT NULL,
	`package_hash` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `quiz_sessions`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "package_marks_allowed" CHECK("question_packages"."max_marks" IN (2,4,6))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `packages_session_position` ON `question_packages` (`session_id`,`position`);--> statement-breakpoint
CREATE TABLE `papers` (
	`id` text PRIMARY KEY NOT NULL,
	`qualification` text NOT NULL,
	`component` text NOT NULL,
	`series` text NOT NULL,
	`year` integer NOT NULL,
	`variant` text NOT NULL,
	`printed_date` text,
	`paper_source_id` text,
	`scheme_source_id` text,
	`identity_status` text NOT NULL,
	`processing_status` text NOT NULL,
	`task_count` integer DEFAULT 0 NOT NULL,
	`total_marks` integer,
	`marks_reconciled` integer DEFAULT false NOT NULL,
	`review_json` text DEFAULT '{}' NOT NULL,
	FOREIGN KEY (`paper_source_id`) REFERENCES `sources`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`scheme_source_id`) REFERENCES `sources`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `quiz_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`subject_id` text NOT NULL,
	`status` text NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`blueprint_json` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`completed_at` text,
	`score` integer,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "session_score_range" CHECK("quiz_sessions"."score" IS NULL OR ("quiz_sessions"."score" >= 0 AND "quiz_sessions"."score" <= 80)),
	CONSTRAINT "session_position_range" CHECK("quiz_sessions"."position" >= 0 AND "quiz_sessions"."position" <= 22)
);
--> statement-breakpoint
CREATE INDEX `sessions_owner_created` ON `quiz_sessions` (`owner_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `sources` (
	`id` text PRIMARY KEY NOT NULL,
	`qualification` text NOT NULL,
	`url` text NOT NULL,
	`title` text NOT NULL,
	`kind` text NOT NULL,
	`issue` text,
	`sha256` text,
	`access_status` text NOT NULL,
	`access_date` text,
	`review_json` text DEFAULT '{}' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `specification_points` (
	`id` text PRIMARY KEY NOT NULL,
	`subject_id` text NOT NULL,
	`source_id` text NOT NULL,
	`reference` text NOT NULL,
	`parent_id` text,
	`source_page` integer NOT NULL,
	`scope_status` text DEFAULT 'candidate' NOT NULL,
	`editorial_summary` text,
	FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`source_id`) REFERENCES `sources`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `subjects` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`title` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `subjects_code_unique` ON `subjects` (`code`);--> statement-breakpoint
CREATE TABLE `progress_summaries` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`source_session_ids_json` text NOT NULL,
	`statistics_json` text NOT NULL,
	`summary_json` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `task_template_links` (
	`task_id` text NOT NULL,
	`template_id` text NOT NULL,
	`template_version` text NOT NULL,
	`relation` text NOT NULL,
	PRIMARY KEY(`task_id`, `template_id`, `template_version`),
	FOREIGN KEY (`task_id`) REFERENCES `paper_tasks`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `paper_tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`paper_id` text NOT NULL,
	`label` text NOT NULL,
	`marks` integer NOT NULL,
	`command_word` text,
	`status` text NOT NULL,
	`analysis_json` text NOT NULL,
	FOREIGN KEY (`paper_id`) REFERENCES `papers`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "task_marks_nonnegative" CHECK("paper_tasks"."marks" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `paper_tasks_paper_label` ON `paper_tasks` (`paper_id`,`label`);--> statement-breakpoint
CREATE TABLE `templates` (
	`id` text NOT NULL,
	`version` text NOT NULL,
	`qualification` text NOT NULL,
	`status` text NOT NULL,
	`private_contract_json` text NOT NULL,
	`validation_json` text NOT NULL,
	PRIMARY KEY(`id`, `version`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`login_count` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `visits` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text,
	`session_hash` text NOT NULL,
	`network_hash` text,
	`created_at` text NOT NULL,
	`expires_at` text NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `visits_session_hash_unique` ON `visits` (`session_hash`);--> statement-breakpoint
CREATE INDEX `visits_expiry` ON `visits` (`expires_at`);