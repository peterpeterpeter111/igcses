-- Rebuild parent and dependent tables together; keep FK enforcement enabled.
-- Copy all data before removing old tables, so ON DELETE CASCADE cannot erase answers/grades.
CREATE TABLE `__new_question_packages` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`position` integer NOT NULL,
	`max_marks` integer NOT NULL,
	`public_json` text NOT NULL,
	`private_json` text NOT NULL,
	`package_hash` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `quiz_sessions`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "package_marks_allowed" CHECK("__new_question_packages"."max_marks" IN (2,3,4,6))
);
--> statement-breakpoint
CREATE TABLE `__new_answers` (
	`package_id` text PRIMARY KEY NOT NULL,
	`text` text NOT NULL,
	`status` text NOT NULL,
	`revision` integer NOT NULL,
	`submission_key` text,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`package_id`) REFERENCES `__new_question_packages`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `__new_grading_revisions` (
	`id` text PRIMARY KEY NOT NULL,
	`package_id` text NOT NULL,
	`revision` integer NOT NULL,
	`earned_marks` integer NOT NULL,
	`rubric_hash` text NOT NULL,
	`model_version` text NOT NULL,
	`feedback_json` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`package_id`) REFERENCES `__new_question_packages`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "earned_marks_range" CHECK("__new_grading_revisions"."earned_marks" >= 0 AND "__new_grading_revisions"."earned_marks" <= 6)
);
--> statement-breakpoint
INSERT INTO `__new_question_packages` SELECT * FROM `question_packages`;
--> statement-breakpoint
INSERT INTO `__new_answers` SELECT * FROM `answers`;
--> statement-breakpoint
INSERT INTO `__new_grading_revisions` SELECT * FROM `grading_revisions`;
--> statement-breakpoint
DROP TABLE `answers`;
--> statement-breakpoint
DROP TABLE `grading_revisions`;
--> statement-breakpoint
DROP TABLE `question_packages`;
--> statement-breakpoint
ALTER TABLE `__new_question_packages` RENAME TO `question_packages`;
--> statement-breakpoint
ALTER TABLE `__new_answers` RENAME TO `answers`;
--> statement-breakpoint
ALTER TABLE `__new_grading_revisions` RENAME TO `grading_revisions`;
--> statement-breakpoint
CREATE UNIQUE INDEX `packages_session_position` ON `question_packages` (`session_id`,`position`);
--> statement-breakpoint
CREATE UNIQUE INDEX `grading_package_revision` ON `grading_revisions` (`package_id`,`revision`);
