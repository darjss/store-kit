CREATE TABLE `brand` (
	`id` text NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`website_url` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT `brand_pk` PRIMARY KEY(`id`),
	CONSTRAINT "brand_id_typeid_check" CHECK(length("id") = 30
    and substr("id", 1, 4) = 'brd_'
    and substr("id", 5, 1) glob '[0-7]'
    and substr("id", 6) not glob '*[^0123456789abcdefghjkmnpqrstvwxyz]*')
);
--> statement-breakpoint
CREATE TABLE `category` (
	`id` text NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT `category_pk` PRIMARY KEY(`id`),
	CONSTRAINT "category_id_typeid_check" CHECK(length("id") = 30
    and substr("id", 1, 4) = 'cat_'
    and substr("id", 5, 1) glob '[0-7]'
    and substr("id", 6) not glob '*[^0123456789abcdefghjkmnpqrstvwxyz]*')
);
--> statement-breakpoint
CREATE TABLE `product` (
	`id` text NOT NULL,
	`slug` text NOT NULL,
	`brand_id` text,
	`category_id` text,
	`name` text NOT NULL,
	`short_description` text,
	`description` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`featured` integer DEFAULT false NOT NULL,
	`details` text,
	`use_cases` text DEFAULT '[]' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT `product_pk` PRIMARY KEY(`id`),
	CONSTRAINT `fk_product_brand_id_brand_id_fk` FOREIGN KEY (`brand_id`) REFERENCES `brand`(`id`) ON DELETE SET NULL,
	CONSTRAINT `fk_product_category_id_category_id_fk` FOREIGN KEY (`category_id`) REFERENCES `category`(`id`) ON DELETE SET NULL,
	CONSTRAINT "product_status_check" CHECK("status" in ('draft', 'active', 'archived')),
	CONSTRAINT "product_id_typeid_check" CHECK(length("id") = 31
    and substr("id", 1, 5) = 'prod_'
    and substr("id", 6, 1) glob '[0-7]'
    and substr("id", 7) not glob '*[^0123456789abcdefghjkmnpqrstvwxyz]*')
);
--> statement-breakpoint
CREATE TABLE `product_image` (
	`id` text NOT NULL,
	`product_id` text NOT NULL,
	`r2_key` text NOT NULL,
	`width` integer NOT NULL,
	`height` integer NOT NULL,
	`alt` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	CONSTRAINT `product_image_pk` PRIMARY KEY(`id`),
	CONSTRAINT `fk_product_image_product_id_product_id_fk` FOREIGN KEY (`product_id`) REFERENCES `product`(`id`) ON DELETE CASCADE,
	CONSTRAINT "product_image_width_check" CHECK("width" > 0),
	CONSTRAINT "product_image_height_check" CHECK("height" > 0),
	CONSTRAINT "product_image_alt_check" CHECK(length(trim("alt")) > 0),
	CONSTRAINT "product_image_id_typeid_check" CHECK(length("id") = 30
    and substr("id", 1, 4) = 'img_'
    and substr("id", 5, 1) glob '[0-7]'
    and substr("id", 6) not glob '*[^0123456789abcdefghjkmnpqrstvwxyz]*')
);
--> statement-breakpoint
CREATE TABLE `product_variant` (
	`id` text NOT NULL,
	`product_id` text NOT NULL,
	`sku` text NOT NULL,
	`name` text NOT NULL,
	`options` text DEFAULT '{}' NOT NULL,
	`price_mnt` integer NOT NULL,
	`compare_at_price_mnt` integer,
	`stock_quantity` integer DEFAULT 0 NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT `product_variant_pk` PRIMARY KEY(`id`),
	CONSTRAINT `fk_product_variant_product_id_product_id_fk` FOREIGN KEY (`product_id`) REFERENCES `product`(`id`) ON DELETE CASCADE,
	CONSTRAINT "product_variant_price_mnt_check" CHECK("price_mnt" >= 0),
	CONSTRAINT "product_variant_compare_at_price_mnt_check" CHECK("compare_at_price_mnt" is null or "compare_at_price_mnt" >= 0),
	CONSTRAINT "product_variant_stock_quantity_check" CHECK("stock_quantity" >= 0),
	CONSTRAINT "product_variant_id_typeid_check" CHECK(length("id") = 30
    and substr("id", 1, 4) = 'var_'
    and substr("id", 5, 1) glob '[0-7]'
    and substr("id", 6) not glob '*[^0123456789abcdefghjkmnpqrstvwxyz]*')
);
--> statement-breakpoint
CREATE TABLE `product_variant_image` (
	`product_id` text NOT NULL,
	`variant_id` text NOT NULL,
	`image_id` text NOT NULL,
	CONSTRAINT `product_variant_image_variant_id_image_id_pk` PRIMARY KEY(`variant_id`, `image_id`),
	CONSTRAINT `product_variant_image_variant_product_fk` FOREIGN KEY (`variant_id`,`product_id`) REFERENCES `product_variant`(`id`,`product_id`) ON DELETE CASCADE,
	CONSTRAINT `product_variant_image_image_product_fk` FOREIGN KEY (`image_id`,`product_id`) REFERENCES `product_image`(`id`,`product_id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `checkout_settings` (
	`id` text NOT NULL,
	`delivery_fee_mnt` integer NOT NULL,
	`bank_name` text NOT NULL,
	`bank_account_name` text NOT NULL,
	`bank_account_number` text NOT NULL,
	`checkout_help_text` text,
	`order_confirmation_text` text,
	`updated_at` integer NOT NULL,
	CONSTRAINT `checkout_settings_pk` PRIMARY KEY(`id`),
	CONSTRAINT "checkout_settings_id_check" CHECK("id" = 'cfg_00000000000000000000000001'),
	CONSTRAINT "checkout_settings_delivery_fee_mnt_check" CHECK("delivery_fee_mnt" >= 0)
);
--> statement-breakpoint
CREATE TABLE `customer_order` (
	`id` text NOT NULL,
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
	CONSTRAINT `customer_order_pk` PRIMARY KEY(`id`),
	CONSTRAINT "customer_order_status_check" CHECK("status" in ('new', 'confirmed', 'preparing', 'delivering', 'completed', 'cancelled')),
	CONSTRAINT "customer_order_money_check" CHECK("subtotal_mnt" >= 0 and "delivery_fee_mnt" >= 0 and "total_mnt" >= 0),
	CONSTRAINT "customer_order_total_check" CHECK("total_mnt" = "subtotal_mnt" + "delivery_fee_mnt"),
	CONSTRAINT "customer_order_id_typeid_check" CHECK(length("id") = 30
    and substr("id", 1, 4) = 'ord_'
    and substr("id", 5, 1) glob '[0-7]'
    and substr("id", 6) not glob '*[^0123456789abcdefghjkmnpqrstvwxyz]*')
);
--> statement-breakpoint
CREATE TABLE `order_line` (
	`id` text NOT NULL,
	`order_id` text NOT NULL,
	`product_id` text,
	`variant_id` text,
	`product_name` text NOT NULL,
	`variant_name` text NOT NULL,
	`sku` text NOT NULL,
	`options` text NOT NULL,
	`image_r2_key` text,
	`image_width` integer,
	`image_height` integer,
	`image_alt` text,
	`unit_price_mnt` integer NOT NULL,
	`quantity` integer NOT NULL,
	`line_total_mnt` integer NOT NULL,
	CONSTRAINT `order_line_pk` PRIMARY KEY(`id`),
	CONSTRAINT `fk_order_line_order_id_customer_order_id_fk` FOREIGN KEY (`order_id`) REFERENCES `customer_order`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_order_line_product_id_product_id_fk` FOREIGN KEY (`product_id`) REFERENCES `product`(`id`) ON DELETE SET NULL,
	CONSTRAINT `fk_order_line_variant_id_product_variant_id_fk` FOREIGN KEY (`variant_id`) REFERENCES `product_variant`(`id`) ON DELETE SET NULL,
	CONSTRAINT "order_line_unit_price_mnt_check" CHECK("unit_price_mnt" >= 0),
	CONSTRAINT "order_line_quantity_check" CHECK("quantity" > 0),
	CONSTRAINT "order_line_total_mnt_check" CHECK("line_total_mnt" >= 0),
	CONSTRAINT "order_line_calculated_total_check" CHECK("line_total_mnt" = "unit_price_mnt" * "quantity"),
	CONSTRAINT "order_line_id_typeid_check" CHECK(length("id") = 31
    and substr("id", 1, 5) = 'line_'
    and substr("id", 6, 1) glob '[0-7]'
    and substr("id", 7) not glob '*[^0123456789abcdefghjkmnpqrstvwxyz]*')
);
--> statement-breakpoint
CREATE TABLE `payment` (
	`id` text NOT NULL,
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
	CONSTRAINT `payment_pk` PRIMARY KEY(`id`),
	CONSTRAINT `fk_payment_order_id_customer_order_id_fk` FOREIGN KEY (`order_id`) REFERENCES `customer_order`(`id`) ON DELETE CASCADE,
	CONSTRAINT "payment_method_check" CHECK("method" in ('qpay', 'bank_transfer')),
	CONSTRAINT "payment_status_check" CHECK("status" in ('pending', 'claimed', 'confirming', 'paid', 'failed')),
	CONSTRAINT "payment_amount_mnt_check" CHECK("amount_mnt" >= 0),
	CONSTRAINT "payment_id_typeid_check" CHECK(length("id") = 30
    and substr("id", 1, 4) = 'pay_'
    and substr("id", 5, 1) glob '[0-7]'
    and substr("id", 6) not glob '*[^0123456789abcdefghjkmnpqrstvwxyz]*')
);
--> statement-breakpoint
CREATE UNIQUE INDEX `brand_slug_unique` ON `brand` (`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `category_slug_unique` ON `category` (`slug`);--> statement-breakpoint
CREATE INDEX `category_active_sort_order_name_index` ON `category` (`active`,`sort_order`,`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `product_slug_unique` ON `product` (`slug`);--> statement-breakpoint
CREATE INDEX `product_status_featured_created_at_index` ON `product` (`status`,`featured`,`created_at`);--> statement-breakpoint
CREATE INDEX `product_category_id_status_featured_created_at_index` ON `product` (`category_id`,`status`,`featured`,`created_at`);--> statement-breakpoint
CREATE INDEX `product_brand_id_status_featured_created_at_index` ON `product` (`brand_id`,`status`,`featured`,`created_at`);--> statement-breakpoint
CREATE INDEX `product_status_created_at_index` ON `product` (`status`,`created_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `product_image_product_id_sort_order_unique` ON `product_image` (`product_id`,`sort_order`);--> statement-breakpoint
CREATE UNIQUE INDEX `product_image_id_product_id_unique` ON `product_image` (`id`,`product_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `product_variant_sku_unique` ON `product_variant` (`sku`);--> statement-breakpoint
CREATE UNIQUE INDEX `product_variant_id_product_id_unique` ON `product_variant` (`id`,`product_id`);--> statement-breakpoint
CREATE INDEX `product_variant_product_id_active_sort_order_index` ON `product_variant` (`product_id`,`active`,`sort_order`);--> statement-breakpoint
CREATE INDEX `product_variant_product_id_active_price_mnt_index` ON `product_variant` (`product_id`,`active`,`price_mnt`);--> statement-breakpoint
CREATE UNIQUE INDEX `customer_order_number_unique` ON `customer_order` (`number`);--> statement-breakpoint
CREATE UNIQUE INDEX `customer_order_status_token_hash_unique` ON `customer_order` (`status_token_hash`);--> statement-breakpoint
CREATE INDEX `customer_order_id_status_token_hash_index` ON `customer_order` (`id`,`status_token_hash`);--> statement-breakpoint
CREATE INDEX `customer_order_created_at_index` ON `customer_order` (`created_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `payment_order_id_unique` ON `payment` (`order_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `payment_provider_invoice_id_unique` ON `payment` (`provider_invoice_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `payment_provider_payment_id_unique` ON `payment` (`provider_payment_id`);--> statement-breakpoint
CREATE INDEX `payment_status_index` ON `payment` (`status`);