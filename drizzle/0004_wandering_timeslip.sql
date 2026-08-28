DELETE FROM `companies`
WHERE `nit` IS NOT NULL
  AND `id` NOT IN (SELECT MIN(`id`) FROM `companies` WHERE `nit` IS NOT NULL GROUP BY `nit`);
--> statement-breakpoint
CREATE UNIQUE INDEX `companies_nit_unique` ON `companies` (`nit`);
