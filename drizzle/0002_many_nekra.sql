CREATE TABLE `companies` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`city` text NOT NULL,
	`representative` text NOT NULL,
	`phone` text,
	`billed_total` integer DEFAULT 0 NOT NULL,
	`outstanding_balance` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `companies_code_unique` ON `companies` (`code`);--> statement-breakpoint
CREATE TABLE `equipment` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`company_id` integer NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`brand` text,
	`model` text,
	`serial_number` text,
	`location` text,
	`status` text DEFAULT 'operational' NOT NULL,
	`registered_at` integer NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `equipment_code_unique` ON `equipment` (`code`);--> statement-breakpoint
CREATE TABLE `service_reports` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`equipment_id` integer NOT NULL,
	`code` text NOT NULL,
	`service_type` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`technician` text NOT NULL,
	`summary` text NOT NULL,
	`observations` text,
	`service_value` integer DEFAULT 0 NOT NULL,
	`service_date` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`equipment_id`) REFERENCES `equipment`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `service_reports_code_unique` ON `service_reports` (`code`);
--> statement-breakpoint
INSERT INTO `companies` (`code`,`name`,`status`,`city`,`representative`,`phone`,`billed_total`,`outstanding_balance`,`created_at`) VALUES
('EMP-042','Óptica Visión Central','active','Bogotá','Laura Martínez','300 456 7812',18450000,2840000,unixepoch('2025-02-12')),
('EMP-041','Centro Visual del Norte','active','Barranquilla','Carlos Rojas','301 332 9041',12380000,0,unixepoch('2025-04-08')),
('EMP-040','Óptica Nueva Mirada','pending','Medellín','Diana Restrepo','315 882 1450',6450000,1260000,unixepoch('2025-07-21'));
--> statement-breakpoint
INSERT INTO `equipment` (`company_id`,`code`,`name`,`brand`,`model`,`serial_number`,`location`,`status`,`registered_at`) VALUES
((SELECT id FROM companies WHERE code='EMP-042'),'EQU-VC-001','Autorefractómetro','Topcon','KR-800','KR8-230419','Consultorio 1','operational',unixepoch('2025-02-15')),
((SELECT id FROM companies WHERE code='EMP-042'),'EQU-VC-002','Lensómetro digital','Nidek','LM-7P','LM7-88412','Laboratorio','maintenance',unixepoch('2025-02-15')),
((SELECT id FROM companies WHERE code='EMP-042'),'EQU-VC-003','Lámpara de hendidura','Huvitz','HS-7000','HS7-50218','Consultorio 2','operational',unixepoch('2025-03-03')),
((SELECT id FROM companies WHERE code='EMP-041'),'EQU-CN-001','Foróptero digital','Nidek','RT-5100','RT5-99182','Sala de refracción','operational',unixepoch('2025-04-12')),
((SELECT id FROM companies WHERE code='EMP-041'),'EQU-CN-002','Proyector de optotipos','Huvitz','HCP-7000','HCP-17340','Consultorio principal','operational',unixepoch('2025-04-12')),
((SELECT id FROM companies WHERE code='EMP-040'),'EQU-NM-001','Biseladora automática','Essilor','Mr Blue 2.0','MB2-30187','Taller','maintenance',unixepoch('2025-07-25')),
((SELECT id FROM companies WHERE code='EMP-040'),'EQU-NM-002','Tonómetro de aire','Topcon','CT-800','CT8-67220','Consultorio 1','operational',unixepoch('2025-07-25'));
--> statement-breakpoint
INSERT INTO `service_reports` (`equipment_id`,`code`,`service_type`,`status`,`technician`,`summary`,`observations`,`service_value`,`service_date`,`created_at`) VALUES
((SELECT id FROM equipment WHERE code='EQU-VC-001'),'REP-2026-0182','Mantenimiento preventivo','completed','Andrés Gómez','Limpieza óptica, verificación mecánica y pruebas de medición.','Equipo dentro de tolerancias. Próximo mantenimiento en seis meses.',680000,unixepoch('2026-06-14'),unixepoch('2026-06-14')),
((SELECT id FROM equipment WHERE code='EQU-VC-001'),'REP-2025-0104','Calibración','completed','Julián Pérez','Calibración contra patrón certificado y ajuste de esfera.','Se emitió certificado de calibración.',920000,unixepoch('2025-11-20'),unixepoch('2025-11-20')),
((SELECT id FROM equipment WHERE code='EQU-VC-002'),'REP-2026-0215','Reparación electrónica','in_progress','Andrés Gómez','Diagnóstico de falla intermitente en la tarjeta de lectura.','Pendiente instalación de repuesto autorizado por el cliente.',1260000,unixepoch('2026-08-15'),unixepoch('2026-08-15')),
((SELECT id FROM equipment WHERE code='EQU-VC-002'),'REP-2026-0119','Mantenimiento preventivo','completed','Natalia Ruiz','Limpieza interna y validación de mediciones.','Sin novedades posteriores al servicio.',540000,unixepoch('2026-03-28'),unixepoch('2026-03-28')),
((SELECT id FROM equipment WHERE code='EQU-VC-003'),'REP-2026-0191','Calibración óptica','scheduled','Julián Pérez','Revisión de iluminación, enfoque y ejes ópticos.','Visita programada con la sede.',780000,unixepoch('2026-08-22'),unixepoch('2026-08-10')),
((SELECT id FROM equipment WHERE code='EQU-CN-001'),'REP-2026-0170','Mantenimiento preventivo','completed','Natalia Ruiz','Inspección de motores, controles y comunicación digital.','Funcionamiento correcto en todas las pruebas.',740000,unixepoch('2026-05-30'),unixepoch('2026-05-30')),
((SELECT id FROM equipment WHERE code='EQU-CN-002'),'REP-2026-0202','Diagnóstico técnico','completed','Andrés Gómez','Corrección de desenfoque y limpieza del sistema de proyección.','Imagen estable y nítida después del ajuste.',490000,unixepoch('2026-07-18'),unixepoch('2026-07-18')),
((SELECT id FROM equipment WHERE code='EQU-NM-001'),'REP-2026-0220','Reparación mecánica','pending','Julián Pérez','Falla reportada en el bloqueo y centrado de lentes.','Pendiente aprobación formal de la cotización.',1260000,unixepoch('2026-08-17'),unixepoch('2026-08-17')),
((SELECT id FROM equipment WHERE code='EQU-NM-002'),'REP-2026-0158','Calibración','completed','Natalia Ruiz','Ajuste de presión y comparación con patrón de referencia.','Lecturas estables dentro del rango permitido.',610000,unixepoch('2026-04-21'),unixepoch('2026-04-21'));
