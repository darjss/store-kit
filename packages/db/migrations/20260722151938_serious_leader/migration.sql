CREATE UNIQUE INDEX `product_image_id_product_id_unique` ON `product_image` (`id`,`product_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `product_variant_id_product_id_unique` ON `product_variant` (`id`,`product_id`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_product_variant_image` (
	`product_id` text NOT NULL,
	`variant_id` text NOT NULL,
	`image_id` text NOT NULL,
	CONSTRAINT `product_variant_image_variant_id_image_id_pk` PRIMARY KEY(`variant_id`, `image_id`),
	CONSTRAINT `product_variant_image_variant_product_fk` FOREIGN KEY (`variant_id`,`product_id`) REFERENCES `product_variant`(`id`,`product_id`) ON DELETE CASCADE,
	CONSTRAINT `product_variant_image_image_product_fk` FOREIGN KEY (`image_id`,`product_id`) REFERENCES `product_image`(`id`,`product_id`) ON DELETE CASCADE
);
--> statement-breakpoint
INSERT INTO `__new_product_variant_image`(`product_id`, `variant_id`, `image_id`) SELECT `product_variant`.`product_id`, `product_variant_image`.`variant_id`, `product_variant_image`.`image_id` FROM `product_variant_image` INNER JOIN `product_variant` ON `product_variant`.`id` = `product_variant_image`.`variant_id` INNER JOIN `product_image` ON `product_image`.`id` = `product_variant_image`.`image_id` AND `product_image`.`product_id` = `product_variant`.`product_id`;--> statement-breakpoint
DROP TABLE `product_variant_image`;--> statement-breakpoint
ALTER TABLE `__new_product_variant_image` RENAME TO `product_variant_image`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
DROP INDEX IF EXISTS `product_category_id_status_index`;--> statement-breakpoint
DROP INDEX IF EXISTS `product_brand_id_status_index`;--> statement-breakpoint
CREATE INDEX `product_category_id_status_featured_created_at_index` ON `product` (`category_id`,`status`,`featured`,`created_at`);--> statement-breakpoint
CREATE INDEX `product_brand_id_status_featured_created_at_index` ON `product` (`brand_id`,`status`,`featured`,`created_at`);--> statement-breakpoint
CREATE INDEX `product_status_created_at_index` ON `product` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `product_variant_product_id_active_price_mnt_index` ON `product_variant` (`product_id`,`active`,`price_mnt`);