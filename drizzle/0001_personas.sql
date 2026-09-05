ALTER TABLE "employees" ADD COLUMN "persona_name" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "persona_description" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "avatar_prompt" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "avatar_url" text;