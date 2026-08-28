CREATE TABLE `app_sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`token_hash` text NOT NULL,
	`user_id` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `app_users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `app_sessions_token_hash_unique` ON `app_sessions` (`token_hash`);--> statement-breakpoint
CREATE TABLE `app_users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`role` text NOT NULL,
	`company` text NOT NULL,
	`password_hash` text,
	`password_salt` text,
	`activation_hash` text,
	`activation_used` integer DEFAULT false NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `app_users_email_unique` ON `app_users` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `app_users_activation_hash_unique` ON `app_users` (`activation_hash`);
--> statement-breakpoint
INSERT INTO `app_users` (`email`, `name`, `role`, `company`, `activation_hash`, `activation_used`, `status`, `created_at`)
VALUES ('yohan_mendoza@outlook.com', 'Yohan Mendoza', 'superowner', 'JD Soluciones Biomédicas', '536d16693d34fbe4ebcc9a7a6326f91c2c1d90b8290961715966a15f9bdb575c', 0, 'active', unixepoch());
