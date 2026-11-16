CREATE TABLE `content_state` (
	`user_id` text PRIMARY KEY NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`seeded_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `grammar_card` (
	`user_id` text NOT NULL,
	`id` text NOT NULL,
	`language` text NOT NULL,
	`level` text NOT NULL,
	`topic` integer NOT NULL,
	`label` text NOT NULL,
	`prompt` text NOT NULL,
	`prompt_side` text NOT NULL,
	`answer` text NOT NULL,
	`answer_side` text NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	PRIMARY KEY(`user_id`, `id`),
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `grammar_card_level_idx` ON `grammar_card` (`user_id`,`language`,`level`);--> statement-breakpoint
CREATE TABLE `grammar_topic` (
	`user_id` text NOT NULL,
	`language` text NOT NULL,
	`level` text NOT NULL,
	`number` integer NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`summary` text DEFAULT '' NOT NULL,
	`markdown` text NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	PRIMARY KEY(`user_id`, `language`, `level`, `number`),
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `lesson` (
	`user_id` text NOT NULL,
	`language` text NOT NULL,
	`level` text NOT NULL,
	`number` integer NOT NULL,
	`title` text NOT NULL,
	PRIMARY KEY(`user_id`, `language`, `level`, `number`),
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `oauth_access_token` (
	`id` text PRIMARY KEY NOT NULL,
	`token` text,
	`client_id` text NOT NULL,
	`session_id` text,
	`user_id` text,
	`reference_id` text,
	`refresh_id` text,
	`expires_at` integer,
	`created_at` integer,
	`scopes` text NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `oauth_client`(`client_id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`session_id`) REFERENCES `session`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`refresh_id`) REFERENCES `oauth_refresh_token`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `oauth_access_token_token_unique` ON `oauth_access_token` (`token`);--> statement-breakpoint
CREATE TABLE `oauth_client` (
	`id` text PRIMARY KEY NOT NULL,
	`client_id` text NOT NULL,
	`client_secret` text,
	`disabled` integer DEFAULT false,
	`skip_consent` integer,
	`enable_end_session` integer,
	`scopes` text,
	`user_id` text,
	`created_at` integer,
	`updated_at` integer,
	`name` text,
	`uri` text,
	`icon` text,
	`contacts` text,
	`tos` text,
	`policy` text,
	`software_id` text,
	`software_version` text,
	`software_statement` text,
	`redirect_uris` text NOT NULL,
	`post_logout_redirect_uris` text,
	`token_endpoint_auth_method` text,
	`grant_types` text,
	`response_types` text,
	`public` integer,
	`type` text,
	`reference_id` text,
	`metadata` text,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `oauth_client_client_id_unique` ON `oauth_client` (`client_id`);--> statement-breakpoint
CREATE TABLE `oauth_consent` (
	`id` text PRIMARY KEY NOT NULL,
	`client_id` text NOT NULL,
	`user_id` text,
	`reference_id` text,
	`scopes` text NOT NULL,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`client_id`) REFERENCES `oauth_client`(`client_id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `oauth_refresh_token` (
	`id` text PRIMARY KEY NOT NULL,
	`token` text NOT NULL,
	`client_id` text NOT NULL,
	`session_id` text,
	`user_id` text NOT NULL,
	`reference_id` text,
	`expires_at` integer,
	`created_at` integer,
	`revoked` integer,
	`scopes` text NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `oauth_client`(`client_id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`session_id`) REFERENCES `session`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `word` (
	`user_id` text NOT NULL,
	`id` text NOT NULL,
	`language` text NOT NULL,
	`level` text NOT NULL,
	`lesson` integer NOT NULL,
	`category` text DEFAULT '' NOT NULL,
	`target` text NOT NULL,
	`native` text NOT NULL,
	`english` text DEFAULT '' NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	PRIMARY KEY(`user_id`, `id`),
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `word_level_idx` ON `word` (`user_id`,`language`,`level`);