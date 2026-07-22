CREATE TABLE `brand` (
	`id` text PRIMARY KEY,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`website_url` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `category` (
	`id` text PRIMARY KEY,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `product` (
	`id` text PRIMARY KEY,
	`slug` text NOT NULL,
	`brand_id` text,
	`category_id` text,
	`name` text NOT NULL,
	`short_description` text,
	`description` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`featured` integer DEFAULT false NOT NULL,
	`details` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT `fk_product_brand_id_brand_id_fk` FOREIGN KEY (`brand_id`) REFERENCES `brand`(`id`) ON DELETE SET NULL,
	CONSTRAINT `fk_product_category_id_category_id_fk` FOREIGN KEY (`category_id`) REFERENCES `category`(`id`) ON DELETE SET NULL,
	CONSTRAINT "product_status_check" CHECK("status" in ('draft', 'active', 'archived'))
);
--> statement-breakpoint
CREATE TABLE `product_image` (
	`id` text PRIMARY KEY,
	`product_id` text NOT NULL,
	`r2_key` text NOT NULL,
	`alt` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	CONSTRAINT `fk_product_image_product_id_product_id_fk` FOREIGN KEY (`product_id`) REFERENCES `product`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `product_variant` (
	`id` text PRIMARY KEY,
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
	CONSTRAINT `fk_product_variant_product_id_product_id_fk` FOREIGN KEY (`product_id`) REFERENCES `product`(`id`) ON DELETE CASCADE,
	CONSTRAINT "product_variant_price_mnt_check" CHECK("price_mnt" >= 0),
	CONSTRAINT "product_variant_compare_at_price_mnt_check" CHECK("compare_at_price_mnt" is null or "compare_at_price_mnt" >= 0),
	CONSTRAINT "product_variant_stock_quantity_check" CHECK("stock_quantity" >= 0)
);
--> statement-breakpoint
CREATE TABLE `product_variant_image` (
	`variant_id` text NOT NULL,
	`image_id` text NOT NULL,
	CONSTRAINT `product_variant_image_variant_id_image_id_pk` PRIMARY KEY(`variant_id`, `image_id`),
	CONSTRAINT `fk_product_variant_image_variant_id_product_variant_id_fk` FOREIGN KEY (`variant_id`) REFERENCES `product_variant`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_product_variant_image_image_id_product_image_id_fk` FOREIGN KEY (`image_id`) REFERENCES `product_image`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE UNIQUE INDEX `brand_slug_unique` ON `brand` (`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `category_slug_unique` ON `category` (`slug`);--> statement-breakpoint
CREATE INDEX `category_active_sort_order_name_index` ON `category` (`active`,`sort_order`,`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `product_slug_unique` ON `product` (`slug`);--> statement-breakpoint
CREATE INDEX `product_status_featured_created_at_index` ON `product` (`status`,`featured`,`created_at`);--> statement-breakpoint
CREATE INDEX `product_category_id_status_index` ON `product` (`category_id`,`status`);--> statement-breakpoint
CREATE INDEX `product_brand_id_status_index` ON `product` (`brand_id`,`status`);--> statement-breakpoint
CREATE UNIQUE INDEX `product_image_product_id_sort_order_unique` ON `product_image` (`product_id`,`sort_order`);--> statement-breakpoint
CREATE UNIQUE INDEX `product_variant_sku_unique` ON `product_variant` (`sku`);--> statement-breakpoint
CREATE INDEX `product_variant_product_id_active_sort_order_index` ON `product_variant` (`product_id`,`active`,`sort_order`);