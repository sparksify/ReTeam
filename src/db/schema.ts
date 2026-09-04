import { sql } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/* ---------------------------------------------------------------------------
 * Enums
 * ------------------------------------------------------------------------- */

export const customerStatusEnum = pgEnum("customer_status", ["active", "disabled"]);
export const licenseStatusEnum = pgEnum("license_status", ["active", "revoked"]);
export const employeeTypeEnum = pgEnum("employee_type", ["factory", "custom"]);
export const employeeStatusEnum = pgEnum("employee_status", ["active", "inactive"]);
/**
 * Version lifecycle for every manual/standards document:
 *  draft      -> editable, never served to customers
 *  published  -> the single current version served to customers
 *  superseded -> was published, replaced by a newer published version (kept for history)
 */
export const versionStatusEnum = pgEnum("version_status", ["draft", "published", "superseded"]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

/* ---------------------------------------------------------------------------
 * Customers & licenses
 * ------------------------------------------------------------------------- */

export const customers = pgTable("customers", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull(),
  name: text("name").notNull(),
  companyName: text("company_name"),
  status: customerStatusEnum("status").notNull().default("active"),
  ...timestamps,
}, (t) => [uniqueIndex("customers_email_idx").on(t.email)]);

export const licenses = pgTable("licenses", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: uuid("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
  /** SHA-256 hex digest of the raw installation token. The raw token is never stored. */
  tokenHash: text("token_hash").notNull(),
  /** First characters of the raw token, for human identification only. */
  tokenPrefix: text("token_prefix").notNull(),
  status: licenseStatusEnum("status").notNull().default("active"),
  /** Set when this license was rotated and replaced by a newer one. */
  replacedByLicenseId: uuid("replaced_by_license_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  activatedAt: timestamp("activated_at", { withTimezone: true }),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  lastAccessedAt: timestamp("last_accessed_at", { withTimezone: true }),
}, (t) => [
  uniqueIndex("licenses_token_hash_idx").on(t.tokenHash),
  index("licenses_customer_id_idx").on(t.customerId),
]);

/* ---------------------------------------------------------------------------
 * Employees (factory-trained and customer-created)
 * ------------------------------------------------------------------------- */

export const employees = pgTable("employees", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  slug: text("slug").notNull(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  category: text("category").notNull().default("general"),
  employeeType: employeeTypeEnum("employee_type").notNull().default("factory"),
  /**
   * Null for factory employees (owned by ReTeam, visible to every customer).
   * Set for custom employees created through the future AI Hiring System;
   * a custom employee is only visible to its owning customer.
   */
  ownerCustomerId: uuid("owner_customer_id").references(() => customers.id, { onDelete: "cascade" }),
  status: employeeStatusEnum("status").notNull().default("active"),
  /** Version number of the currently published manual, or null if none published. */
  currentVersion: integer("current_version"),
  /** Example phrases a Realtor might say that should route work to this employee. */
  triggerExamples: jsonb("trigger_examples").$type<string[]>().notNull().default([]),
  /** Short summary of what this employee needs as input. */
  inputSummary: text("input_summary").notNull().default(""),
  /** Short summary of what this employee produces. */
  outputSummary: text("output_summary").notNull().default(""),
  sortOrder: integer("sort_order").notNull().default(100),
  ...timestamps,
}, (t) => [
  // Factory slugs are globally unique; custom slugs are unique per owner.
  uniqueIndex("employees_slug_owner_idx").on(t.slug, sql`coalesce(${t.ownerCustomerId}, '00000000-0000-0000-0000-000000000000'::uuid)`),
  index("employees_owner_idx").on(t.ownerCustomerId),
]);

export const employeeManualVersions = pgTable("employee_manual_versions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  employeeId: uuid("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
  version: integer("version").notNull(),
  content: text("content").notNull(),
  status: versionStatusEnum("status").notNull().default("draft"),
  changeNotes: text("change_notes").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  publishedAt: timestamp("published_at", { withTimezone: true }),
}, (t) => [
  uniqueIndex("employee_manual_versions_employee_version_idx").on(t.employeeId, t.version),
  index("employee_manual_versions_status_idx").on(t.employeeId, t.status),
]);

/* ---------------------------------------------------------------------------
 * Company-wide documents
 * ------------------------------------------------------------------------- */

export const chiefOfStaffManualVersions = pgTable("chief_of_staff_manual_versions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  version: integer("version").notNull(),
  content: text("content").notNull(),
  status: versionStatusEnum("status").notNull().default("draft"),
  changeNotes: text("change_notes").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  publishedAt: timestamp("published_at", { withTimezone: true }),
}, (t) => [uniqueIndex("cos_manual_versions_version_idx").on(t.version)]);

export const globalStandardVersions = pgTable("global_standard_versions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  version: integer("version").notNull(),
  content: text("content").notNull(),
  status: versionStatusEnum("status").notNull().default("draft"),
  changeNotes: text("change_notes").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  publishedAt: timestamp("published_at", { withTimezone: true }),
}, (t) => [uniqueIndex("global_standard_versions_version_idx").on(t.version)]);

/* ---------------------------------------------------------------------------
 * Customer profile (Realtor profile captured by the Chief of Staff)
 * ------------------------------------------------------------------------- */

export type RealtorProfile = Record<string, unknown>;

export const customerProfiles = pgTable("customer_profiles", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: uuid("customer_id").notNull().references(() => customers.id, { onDelete: "cascade" }),
  profileJson: jsonb("profile_json").$type<RealtorProfile>().notNull().default({}),
  ...timestamps,
}, (t) => [uniqueIndex("customer_profiles_customer_idx").on(t.customerId)]);

/* ---------------------------------------------------------------------------
 * Access logs (lightweight, privacy-conscious)
 * ------------------------------------------------------------------------- */

export const accessLogs = pgTable("access_logs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  licenseId: uuid("license_id").notNull().references(() => licenses.id, { onDelete: "cascade" }),
  resourceType: text("resource_type").notNull(),
  resourceIdentifier: text("resource_identifier"),
  /** Salted SHA-256 of the client IP. Raw IPs are never stored. */
  ipHash: text("ip_hash"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("access_logs_license_created_idx").on(t.licenseId, t.createdAt)]);

/* ---------------------------------------------------------------------------
 * Row types
 * ------------------------------------------------------------------------- */

export type Customer = typeof customers.$inferSelect;
export type License = typeof licenses.$inferSelect;
export type Employee = typeof employees.$inferSelect;
export type EmployeeManualVersion = typeof employeeManualVersions.$inferSelect;
export type ChiefOfStaffManualVersion = typeof chiefOfStaffManualVersions.$inferSelect;
export type GlobalStandardVersion = typeof globalStandardVersions.$inferSelect;
export type CustomerProfile = typeof customerProfiles.$inferSelect;
export type AccessLog = typeof accessLogs.$inferSelect;
