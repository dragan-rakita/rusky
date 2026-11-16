ALTER TABLE `grammar_card` ADD `mode` text DEFAULT 'flip' NOT NULL;--> statement-breakpoint
ALTER TABLE `grammar_card` ADD `hint` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `grammar_card` ADD `translation` text DEFAULT '' NOT NULL;