ALTER TABLE `checkout_settings` ADD `order_prefix` text DEFAULT 'PLG' NOT NULL;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_checkout_settings` (
	`id` text NOT NULL,
	`delivery_fee_mnt` integer NOT NULL,
	`order_prefix` text DEFAULT 'PLG' NOT NULL,
	`bank_name` text NOT NULL,
	`bank_account_name` text NOT NULL,
	`bank_account_number` text NOT NULL,
	`checkout_help_text` text,
	`order_confirmation_text` text,
	`updated_at` integer NOT NULL,
	CONSTRAINT `checkout_settings_pk` PRIMARY KEY(`id`),
	CONSTRAINT "checkout_settings_id_check" CHECK("id" = 'cfg_00000000000000000000000001'),
	CONSTRAINT "checkout_settings_delivery_fee_mnt_check" CHECK("delivery_fee_mnt" >= 0),
	CONSTRAINT "checkout_settings_order_prefix_check" CHECK(length("order_prefix") between 2 and 5 and "order_prefix" not glob '*[^A-Z]*')
);
--> statement-breakpoint
INSERT INTO `__new_checkout_settings`(`id`, `delivery_fee_mnt`, `bank_name`, `bank_account_name`, `bank_account_number`, `checkout_help_text`, `order_confirmation_text`, `updated_at`) SELECT `id`, `delivery_fee_mnt`, `bank_name`, `bank_account_name`, `bank_account_number`, `checkout_help_text`, `order_confirmation_text`, `updated_at` FROM `checkout_settings`;--> statement-breakpoint
DROP TABLE `checkout_settings`;--> statement-breakpoint
ALTER TABLE `__new_checkout_settings` RENAME TO `checkout_settings`;--> statement-breakpoint
PRAGMA foreign_keys=ON;