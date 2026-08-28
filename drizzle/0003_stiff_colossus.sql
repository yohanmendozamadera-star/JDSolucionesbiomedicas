ALTER TABLE `companies` ADD `nit` text;--> statement-breakpoint
ALTER TABLE `companies` ADD `representative_email` text;--> statement-breakpoint
ALTER TABLE `companies` ADD `department` text;--> statement-breakpoint
ALTER TABLE `companies` ADD `municipality` text;--> statement-breakpoint
ALTER TABLE `equipment` ADD `purchase_date` integer;--> statement-breakpoint
ALTER TABLE `equipment` ADD `contact_name` text;--> statement-breakpoint
ALTER TABLE `equipment` ADD `supplier_name` text;--> statement-breakpoint
ALTER TABLE `equipment` ADD `supplier_address` text;--> statement-breakpoint
ALTER TABLE `equipment` ADD `supplier_phone` text;--> statement-breakpoint
ALTER TABLE `equipment` ADD `supplier_email` text;--> statement-breakpoint
ALTER TABLE `equipment` ADD `requires_metrology` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `equipment` ADD `calibration_frequency` text;--> statement-breakpoint
ALTER TABLE `equipment` ADD `technical_documents` text;--> statement-breakpoint
ALTER TABLE `equipment` ADD `observations` text;--> statement-breakpoint
ALTER TABLE `service_reports` ADD `start_time` text;--> statement-breakpoint
ALTER TABLE `service_reports` ADD `end_time` text;--> statement-breakpoint
ALTER TABLE `service_reports` ADD `reported_fault_code` text;--> statement-breakpoint
ALTER TABLE `service_reports` ADD `found_fault_code` text;--> statement-breakpoint
ALTER TABLE `service_reports` ADD `calibration_verified` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `service_reports` ADD `calibration_measurements` text;--> statement-breakpoint
ALTER TABLE `service_reports` ADD `received_by` text;