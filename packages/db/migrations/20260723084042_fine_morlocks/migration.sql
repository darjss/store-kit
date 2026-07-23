CREATE TABLE `checkout_settings` (
	`id` text PRIMARY KEY,
	`delivery_fee_mnt` integer NOT NULL,
	`bank_name` text NOT NULL,
	`bank_account_name` text NOT NULL,
	`bank_account_number` text NOT NULL,
	`checkout_help_text` text,
	`order_confirmation_text` text,
	`updated_at` integer NOT NULL,
	CONSTRAINT "checkout_settings_id_check" CHECK("id" = 'default'),
	CONSTRAINT "checkout_settings_delivery_fee_mnt_check" CHECK("delivery_fee_mnt" >= 0)
);
--> statement-breakpoint
CREATE TABLE `customer_order` (
	`id` text PRIMARY KEY,
	`number` text NOT NULL,
	`status_token_hash` text NOT NULL,
	`status` text NOT NULL,
	`customer_name` text NOT NULL,
	`customer_phone` text NOT NULL,
	`district` text NOT NULL,
	`khoroo` text NOT NULL,
	`address` text NOT NULL,
	`delivery_notes` text,
	`subtotal_mnt` integer NOT NULL,
	`delivery_fee_mnt` integer NOT NULL,
	`total_mnt` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT "customer_order_status_check" CHECK("status" in ('new', 'confirmed', 'preparing', 'delivering', 'completed', 'cancelled')),
	CONSTRAINT "customer_order_money_check" CHECK("subtotal_mnt" >= 0 and "delivery_fee_mnt" >= 0 and "total_mnt" >= 0),
	CONSTRAINT "customer_order_total_check" CHECK("total_mnt" = "subtotal_mnt" + "delivery_fee_mnt")
);
--> statement-breakpoint
CREATE TABLE `order_line` (
	`id` text PRIMARY KEY,
	`order_id` text NOT NULL,
	`product_id` text,
	`variant_id` text,
	`product_name` text NOT NULL,
	`variant_name` text NOT NULL,
	`sku` text NOT NULL,
	`options` text NOT NULL,
	`image_r2_key` text,
	`unit_price_mnt` integer NOT NULL,
	`quantity` integer NOT NULL,
	`line_total_mnt` integer NOT NULL,
	CONSTRAINT `fk_order_line_order_id_customer_order_id_fk` FOREIGN KEY (`order_id`) REFERENCES `customer_order`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_order_line_product_id_product_id_fk` FOREIGN KEY (`product_id`) REFERENCES `product`(`id`) ON DELETE SET NULL,
	CONSTRAINT `fk_order_line_variant_id_product_variant_id_fk` FOREIGN KEY (`variant_id`) REFERENCES `product_variant`(`id`) ON DELETE SET NULL,
	CONSTRAINT "order_line_unit_price_mnt_check" CHECK("unit_price_mnt" >= 0),
	CONSTRAINT "order_line_quantity_check" CHECK("quantity" > 0),
	CONSTRAINT "order_line_total_mnt_check" CHECK("line_total_mnt" >= 0),
	CONSTRAINT "order_line_calculated_total_check" CHECK("line_total_mnt" = "unit_price_mnt" * "quantity")
);
--> statement-breakpoint
CREATE TABLE `payment` (
	`id` text PRIMARY KEY,
	`order_id` text NOT NULL,
	`method` text NOT NULL,
	`status` text NOT NULL,
	`amount_mnt` integer NOT NULL,
	`provider_invoice_id` text,
	`provider_payment_id` text,
	`claimed_at` integer,
	`telegram_message_id` text,
	`paid_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT `fk_payment_order_id_customer_order_id_fk` FOREIGN KEY (`order_id`) REFERENCES `customer_order`(`id`) ON DELETE CASCADE,
	CONSTRAINT "payment_method_check" CHECK("method" in ('qpay', 'bank_transfer')),
	CONSTRAINT "payment_status_check" CHECK("status" in ('pending', 'claimed', 'confirming', 'paid', 'failed')),
	CONSTRAINT "payment_amount_mnt_check" CHECK("amount_mnt" >= 0)
);
--> statement-breakpoint
ALTER TABLE `product` ADD `use_cases` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `customer_order_number_unique` ON `customer_order` (`number`);--> statement-breakpoint
CREATE UNIQUE INDEX `customer_order_status_token_hash_unique` ON `customer_order` (`status_token_hash`);--> statement-breakpoint
CREATE INDEX `customer_order_id_status_token_hash_index` ON `customer_order` (`id`,`status_token_hash`);--> statement-breakpoint
CREATE INDEX `customer_order_created_at_index` ON `customer_order` (`created_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `payment_order_id_unique` ON `payment` (`order_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `payment_provider_invoice_id_unique` ON `payment` (`provider_invoice_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `payment_provider_payment_id_unique` ON `payment` (`provider_payment_id`);--> statement-breakpoint
CREATE INDEX `payment_status_index` ON `payment` (`status`);