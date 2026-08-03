CREATE TABLE `account` (
	`id` text NOT NULL,
	`user_id` text NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`id_token` text,
	`password` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT `account_pk` PRIMARY KEY(`id`),
	CONSTRAINT `fk_account_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE,
	CONSTRAINT "account_id_typeid_check" CHECK(length("id") = 31
    and substr("id", 1, 5) = 'acct_'
    and substr("id", 6, 1) glob '[0-7]'
    and substr("id", 7) not glob '*[^0123456789abcdefghjkmnpqrstvwxyz]*')
);
--> statement-breakpoint
CREATE TABLE `session` (
	`id` text NOT NULL,
	`user_id` text NOT NULL,
	`token` text NOT NULL,
	`expires_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT `session_pk` PRIMARY KEY(`id`),
	CONSTRAINT `fk_session_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE,
	CONSTRAINT "session_id_typeid_check" CHECK(length("id") = 30
    and substr("id", 1, 4) = 'ses_'
    and substr("id", 5, 1) glob '[0-7]'
    and substr("id", 6) not glob '*[^0123456789abcdefghjkmnpqrstvwxyz]*')
);
--> statement-breakpoint
CREATE TABLE `user` (
	`id` text NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`image` text,
	`approved` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT `user_pk` PRIMARY KEY(`id`),
	CONSTRAINT "user_id_typeid_check" CHECK(length("id") = 30
    and substr("id", 1, 4) = 'usr_'
    and substr("id", 5, 1) glob '[0-7]'
    and substr("id", 6) not glob '*[^0123456789abcdefghjkmnpqrstvwxyz]*')
);
--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT `verification_pk` PRIMARY KEY(`id`),
	CONSTRAINT "verification_id_typeid_check" CHECK(length("id") = 30
    and substr("id", 1, 4) = 'ver_'
    and substr("id", 5, 1) glob '[0-7]'
    and substr("id", 6) not glob '*[^0123456789abcdefghjkmnpqrstvwxyz]*')
);
--> statement-breakpoint
CREATE UNIQUE INDEX `account_provider_account_unique` ON `account` (`provider_id`,`account_id`);--> statement-breakpoint
CREATE INDEX `account_user_id_index` ON `account` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE INDEX `session_user_id_index` ON `session` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE INDEX `verification_identifier_index` ON `verification` (`identifier`);