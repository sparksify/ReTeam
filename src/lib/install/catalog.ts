import type { Db } from "@/db/client";
import { getPublishedManual, listEmployeesForCustomer } from "@/lib/employees";
import type { CatalogEntry } from "./responses";

/** Employees visible to the customer, each paired with its published manual (if any). */
export async function loadCatalog(db: Db, customerId: string): Promise<CatalogEntry[]> {
  const list = await listEmployeesForCustomer(db, customerId);
  return Promise.all(list.map(async (employee) => ({ employee, manual: await getPublishedManual(db, employee.id) })));
}
