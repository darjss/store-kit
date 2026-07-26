ALTER TABLE `payment` ADD `staff_notification_status` text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_payment` (
	`id` text NOT NULL,
	`order_id` text NOT NULL,
	`method` text NOT NULL,
	`status` text NOT NULL,
	`amount_mnt` integer NOT NULL,
	`provider_invoice_id` text,
	`provider_payment_id` text,
	`claimed_at` integer,
	`telegram_message_id` text,
	`staff_notification_status` text DEFAULT 'pending' NOT NULL,
	`paid_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT `payment_pk` PRIMARY KEY(`id`),
	CONSTRAINT `fk_payment_order_id_customer_order_id_fk` FOREIGN KEY (`order_id`) REFERENCES `customer_order`(`id`) ON DELETE CASCADE,
	CONSTRAINT "payment_method_check" CHECK("method" in ('qpay', 'bank_transfer')),
	CONSTRAINT "payment_status_check" CHECK("status" in ('pending', 'claimed', 'confirming', 'paid', 'failed')),
	CONSTRAINT "payment_amount_mnt_check" CHECK("amount_mnt" >= 0),
	CONSTRAINT "payment_staff_notification_status_check" CHECK("staff_notification_status" in ('pending', 'sending', 'sent')),
	CONSTRAINT "payment_id_typeid_check" CHECK(length("id") = 30
    and substr("id", 1, 4) = 'pay_'
    and substr("id", 5, 1) glob '[0-7]'
    and substr("id", 6) not glob '*[^0123456789abcdefghjkmnpqrstvwxyz]*')
);
--> statement-breakpoint
INSERT INTO `__new_payment`(`id`, `order_id`, `method`, `status`, `amount_mnt`, `provider_invoice_id`, `provider_payment_id`, `claimed_at`, `telegram_message_id`, `paid_at`, `created_at`, `updated_at`) SELECT `id`, `order_id`, `method`, `status`, `amount_mnt`, `provider_invoice_id`, `provider_payment_id`, `claimed_at`, `telegram_message_id`, `paid_at`, `created_at`, `updated_at` FROM `payment`;--> statement-breakpoint
DROP TABLE `payment`;--> statement-breakpoint
ALTER TABLE `__new_payment` RENAME TO `payment`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `payment_order_id_unique` ON `payment` (`order_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `payment_provider_invoice_id_unique` ON `payment` (`provider_invoice_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `payment_provider_payment_id_unique` ON `payment` (`provider_payment_id`);--> statement-breakpoint
CREATE INDEX `payment_status_index` ON `payment` (`status`);