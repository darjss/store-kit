ALTER TABLE `product_image` ADD `width` integer NOT NULL;--> statement-breakpoint
ALTER TABLE `product_image` ADD `height` integer NOT NULL;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_product_image` (
	`id` text PRIMARY KEY,
	`product_id` text NOT NULL,
	`r2_key` text NOT NULL,
	`width` integer NOT NULL,
	`height` integer NOT NULL,
	`alt` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
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
INSERT INTO `__new_product_image`(`id`, `product_id`, `r2_key`, `alt`, `sort_order`, `created_at`) SELECT `id`, `product_id`, `r2_key`, `alt`, `sort_order`, `created_at` FROM `product_image`;--> statement-breakpoint
DROP TABLE `product_image`;--> statement-breakpoint
ALTER TABLE `__new_product_image` RENAME TO `product_image`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `product_image_product_id_sort_order_unique` ON `product_image` (`product_id`,`sort_order`);--> statement-breakpoint
CREATE UNIQUE INDEX `product_image_id_product_id_unique` ON `product_image` (`id`,`product_id`);