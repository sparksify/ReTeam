CREATE TYPE "public"."customer_status" AS ENUM('active', 'disabled');--> statement-breakpoint
CREATE TYPE "public"."employee_status" AS ENUM('active', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."employee_type" AS ENUM('factory', 'custom');--> statement-breakpoint
CREATE TYPE "public"."license_status" AS ENUM('active', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."version_status" AS ENUM('draft', 'published', 'superseded');--> statement-breakpoint
CREATE TABLE "access_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"license_id" uuid NOT NULL,
	"resource_type" text NOT NULL,
	"resource_identifier" text,
	"ip_hash" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chief_of_staff_manual_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version" integer NOT NULL,
	"content" text NOT NULL,
	"status" "version_status" DEFAULT 'draft' NOT NULL,
	"change_notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "customer_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"profile_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"company_name" text,
	"status" "customer_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employee_manual_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"content" text NOT NULL,
	"status" "version_status" DEFAULT 'draft' NOT NULL,
	"change_notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "employees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"category" text DEFAULT 'general' NOT NULL,
	"employee_type" "employee_type" DEFAULT 'factory' NOT NULL,
	"owner_customer_id" uuid,
	"status" "employee_status" DEFAULT 'active' NOT NULL,
	"current_version" integer,
	"trigger_examples" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"input_summary" text DEFAULT '' NOT NULL,
	"output_summary" text DEFAULT '' NOT NULL,
	"sort_order" integer DEFAULT 100 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "global_standard_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version" integer NOT NULL,
	"content" text NOT NULL,
	"status" "version_status" DEFAULT 'draft' NOT NULL,
	"change_notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "licenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"token_prefix" text NOT NULL,
	"status" "license_status" DEFAULT 'active' NOT NULL,
	"replaced_by_license_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"activated_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"last_accessed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "access_logs" ADD CONSTRAINT "access_logs_license_id_licenses_id_fk" FOREIGN KEY ("license_id") REFERENCES "public"."licenses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_profiles" ADD CONSTRAINT "customer_profiles_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_manual_versions" ADD CONSTRAINT "employee_manual_versions_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_owner_customer_id_customers_id_fk" FOREIGN KEY ("owner_customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "licenses" ADD CONSTRAINT "licenses_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "access_logs_license_created_idx" ON "access_logs" USING btree ("license_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "cos_manual_versions_version_idx" ON "chief_of_staff_manual_versions" USING btree ("version");--> statement-breakpoint
CREATE UNIQUE INDEX "customer_profiles_customer_idx" ON "customer_profiles" USING btree ("customer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "customers_email_idx" ON "customers" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "employee_manual_versions_employee_version_idx" ON "employee_manual_versions" USING btree ("employee_id","version");--> statement-breakpoint
CREATE INDEX "employee_manual_versions_status_idx" ON "employee_manual_versions" USING btree ("employee_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "employees_slug_owner_idx" ON "employees" USING btree ("slug",coalesce("owner_customer_id", '00000000-0000-0000-0000-000000000000'::uuid));--> statement-breakpoint
CREATE INDEX "employees_owner_idx" ON "employees" USING btree ("owner_customer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "global_standard_versions_version_idx" ON "global_standard_versions" USING btree ("version");--> statement-breakpoint
CREATE UNIQUE INDEX "licenses_token_hash_idx" ON "licenses" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "licenses_customer_id_idx" ON "licenses" USING btree ("customer_id");