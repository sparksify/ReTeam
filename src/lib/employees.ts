import { and, asc, desc, eq, isNull, max, or } from "drizzle-orm";
import type { Db } from "@/db/client";
import {
  employeeManualVersions,
  employees,
  type Employee,
  type EmployeeManualVersion,
} from "@/db/schema";

/* ------------------------------ catalog ---------------------------------- */

/** Factory employees plus any custom employees owned by the customer. */
export async function listEmployeesForCustomer(db: Db, customerId: string): Promise<Employee[]> {
  return db
    .select()
    .from(employees)
    .where(
      and(
        eq(employees.status, "active"),
        or(
          and(eq(employees.employeeType, "factory"), isNull(employees.ownerCustomerId)),
          eq(employees.ownerCustomerId, customerId),
        ),
      ),
    )
    .orderBy(asc(employees.sortOrder), asc(employees.name));
}

export async function getEmployeeBySlugForCustomer(
  db: Db,
  slug: string,
  customerId: string,
): Promise<Employee | null> {
  const [row] = await db
    .select()
    .from(employees)
    .where(
      and(
        eq(employees.slug, slug),
        eq(employees.status, "active"),
        or(
          and(eq(employees.employeeType, "factory"), isNull(employees.ownerCustomerId)),
          eq(employees.ownerCustomerId, customerId),
        ),
      ),
    )
    .limit(1);
  return row ?? null;
}

/* ------------------------------- admin ----------------------------------- */

export async function listAllEmployees(db: Db): Promise<Employee[]> {
  return db.select().from(employees).orderBy(asc(employees.employeeType), asc(employees.sortOrder), asc(employees.name));
}

export async function getEmployeeById(db: Db, id: string): Promise<Employee | null> {
  const [row] = await db.select().from(employees).where(eq(employees.id, id)).limit(1);
  return row ?? null;
}

export async function getFactoryEmployeeBySlug(db: Db, slug: string): Promise<Employee | null> {
  const [row] = await db
    .select()
    .from(employees)
    .where(and(eq(employees.slug, slug), isNull(employees.ownerCustomerId)))
    .limit(1);
  return row ?? null;
}

export type EmployeeMetadataInput = {
  name: string;
  description: string;
  category: string;
  status: Employee["status"];
  triggerExamples: string[];
  inputSummary: string;
  outputSummary: string;
  personaName: string;
  personaDescription: string;
  avatarPrompt: string;
  avatarUrl: string | null;
  sortOrder: number;
};

export async function updateEmployeeMetadata(
  db: Db,
  id: string,
  input: EmployeeMetadataInput,
): Promise<Employee | null> {
  const [row] = await db
    .update(employees)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(employees.id, id))
    .returning();
  return row ?? null;
}

/* ------------------------------ manuals ---------------------------------- */

export async function getPublishedManual(db: Db, employeeId: string): Promise<EmployeeManualVersion | null> {
  const [row] = await db
    .select()
    .from(employeeManualVersions)
    .where(and(eq(employeeManualVersions.employeeId, employeeId), eq(employeeManualVersions.status, "published")))
    .orderBy(desc(employeeManualVersions.version))
    .limit(1);
  return row ?? null;
}

export async function listManualVersions(db: Db, employeeId: string): Promise<EmployeeManualVersion[]> {
  return db
    .select()
    .from(employeeManualVersions)
    .where(eq(employeeManualVersions.employeeId, employeeId))
    .orderBy(desc(employeeManualVersions.version));
}

export async function getManualVersion(db: Db, id: string): Promise<EmployeeManualVersion | null> {
  const [row] = await db.select().from(employeeManualVersions).where(eq(employeeManualVersions.id, id)).limit(1);
  return row ?? null;
}

export async function createManualDraft(
  db: Db,
  employeeId: string,
  input: { content: string; changeNotes?: string },
): Promise<EmployeeManualVersion> {
  const [{ latest }] = await db
    .select({ latest: max(employeeManualVersions.version) })
    .from(employeeManualVersions)
    .where(eq(employeeManualVersions.employeeId, employeeId));
  const [row] = await db
    .insert(employeeManualVersions)
    .values({
      employeeId,
      version: (latest ?? 0) + 1,
      content: input.content,
      changeNotes: input.changeNotes ?? "",
    })
    .returning();
  return row;
}

export async function updateManualDraft(
  db: Db,
  id: string,
  input: { content: string; changeNotes?: string },
): Promise<EmployeeManualVersion | null> {
  const [row] = await db
    .update(employeeManualVersions)
    .set({ content: input.content, changeNotes: input.changeNotes ?? "" })
    .where(and(eq(employeeManualVersions.id, id), eq(employeeManualVersions.status, "draft")))
    .returning();
  return row ?? null;
}

/**
 * Publishes a draft manual. The previously published version is marked
 * `superseded` and kept forever; `employees.current_version` is updated.
 */
export async function publishManualVersion(db: Db, id: string): Promise<EmployeeManualVersion | null> {
  const target = await getManualVersion(db, id);
  if (!target || target.status !== "draft") return null;
  await db
    .update(employeeManualVersions)
    .set({ status: "superseded" })
    .where(and(eq(employeeManualVersions.employeeId, target.employeeId), eq(employeeManualVersions.status, "published")));
  const [row] = await db
    .update(employeeManualVersions)
    .set({ status: "published", publishedAt: new Date() })
    .where(eq(employeeManualVersions.id, id))
    .returning();
  await db
    .update(employees)
    .set({ currentVersion: row.version, updatedAt: new Date() })
    .where(eq(employees.id, target.employeeId));
  return row;
}
