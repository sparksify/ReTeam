import { eq } from "drizzle-orm";
import type { Db } from "@/db/client";
import { employees } from "@/db/schema";
import { CHIEF_OF_STAFF_MANUAL_V1 } from "@/content/chief-of-staff-manual";
import { FACTORY_EMPLOYEES } from "@/content/factory-employees";
import { GLOBAL_STANDARDS_V1 } from "@/content/global-standards";
import { createCustomer, getCustomerByEmail } from "./customers";
import { createDocumentDraft, listDocumentVersions, publishDocumentVersion } from "./documents";
import { createManualDraft, getFactoryEmployeeBySlug, listManualVersions, publishManualVersion } from "./employees";
import { issueLicense, type IssuedLicense } from "./licenses";
import type { Customer } from "@/db/schema";

export const TEST_CUSTOMER_EMAIL = "test-realtor@reteam.local";

export type SeedReport = {
  employeesCreated: string[];
  employeesUpdated: string[];
  manualsSeeded: string[];
  chiefOfStaffSeeded: boolean;
  standardsSeeded: boolean;
};

/**
 * Idempotent factory content seed:
 *  - upserts the five factory employees' metadata (never touches manual content)
 *  - seeds a published placeholder manual v1 for any employee with no versions
 *  - seeds a published Chief of Staff manual v1 and Global Standards v1 if none exist
 */
export async function seedFactoryContent(db: Db): Promise<SeedReport> {
  const report: SeedReport = {
    employeesCreated: [],
    employeesUpdated: [],
    manualsSeeded: [],
    chiefOfStaffSeeded: false,
    standardsSeeded: false,
  };

  for (const seed of FACTORY_EMPLOYEES) {
    const metadata = {
      name: seed.name,
      description: seed.description,
      category: seed.category,
      triggerExamples: seed.triggerExamples,
      inputSummary: seed.inputSummary,
      outputSummary: seed.outputSummary,
      sortOrder: seed.sortOrder,
    };
    let employee = await getFactoryEmployeeBySlug(db, seed.slug);
    if (!employee) {
      [employee] = await db
        .insert(employees)
        .values({ slug: seed.slug, employeeType: "factory", ...metadata })
        .returning();
      report.employeesCreated.push(seed.slug);
    } else {
      await db.update(employees).set({ ...metadata, updatedAt: new Date() }).where(eq(employees.id, employee.id));
      report.employeesUpdated.push(seed.slug);
    }

    const versions = await listManualVersions(db, employee.id);
    if (versions.length === 0) {
      const draft = await createManualDraft(db, employee.id, {
        content: seed.placeholderManual,
        changeNotes: "Seeded development placeholder.",
      });
      await publishManualVersion(db, draft.id);
      report.manualsSeeded.push(seed.slug);
    }
  }

  if ((await listDocumentVersions(db, "chief_of_staff")).length === 0) {
    const draft = await createDocumentDraft(db, "chief_of_staff", {
      content: CHIEF_OF_STAFF_MANUAL_V1,
      changeNotes: "Initial V1 operating framework.",
    });
    await publishDocumentVersion(db, "chief_of_staff", draft.id);
    report.chiefOfStaffSeeded = true;
  }

  if ((await listDocumentVersions(db, "standards")).length === 0) {
    const draft = await createDocumentDraft(db, "standards", {
      content: GLOBAL_STANDARDS_V1,
      changeNotes: "Initial V1 standards.",
    });
    await publishDocumentVersion(db, "standards", draft.id);
    report.standardsSeeded = true;
  }

  return report;
}

/** Finds or creates the development/test customer. */
export async function ensureTestCustomer(db: Db): Promise<Customer> {
  const existing = await getCustomerByEmail(db, TEST_CUSTOMER_EMAIL);
  if (existing) return existing;
  return createCustomer(db, {
    email: TEST_CUSTOMER_EMAIL,
    name: "Test Realtor",
    companyName: "ReTeam Test Brokerage",
  });
}

/** Issues a fresh installation token for the test customer. */
export async function issueTestLicense(db: Db): Promise<{ customer: Customer; issued: IssuedLicense }> {
  const customer = await ensureTestCustomer(db);
  const issued = await issueLicense(db, customer.id);
  return { customer, issued };
}
