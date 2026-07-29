CREATE UNIQUE INDEX `product_image_r2_key_unique` ON `product_image` (`r2_key`);--> statement-breakpoint
CREATE INDEX `order_line_product_id_index` ON `order_line` (`product_id`);--> statement-breakpoint
CREATE INDEX `order_line_variant_id_index` ON `order_line` (`variant_id`);--> statement-breakpoint
CREATE INDEX `order_line_image_r2_key_index` ON `order_line` (`image_r2_key`);