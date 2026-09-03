import { desc, eq, sql } from "drizzle-orm";
import type { Db } from "@/db/client";
import {
  customerProfiles,
  customers,
  type Customer,
  type CustomerProfile,
  type RealtorProfile,
} from "@/db/schema";

export type NewCustomerInput = { email: string; name: string; companyName?: string | null };

export async function createCustomer(db: Db, input: NewCustomerInput): Promise<Customer> {
  const [row] = await db
    .insert(customers)
    .values({
      email: input.email.trim().toLowerCase(),
      name: input.name.trim(),
      companyName: input.companyName?.trim() || null,
    })
    .returning();
  return row;
}

export async function listCustomers(db: Db): Promise<Customer[]> {
  return db.select().from(customers).orderBy(desc(customers.createdAt));
}

export async function getCustomer(db: Db, id: string): Promise<Customer | null> {
  const [row] = await db.select().from(customers).where(eq(customers.id, id)).limit(1);
  return row ?? null;
}

export async function getCustomerByEmail(db: Db, email: string): Promise<Customer | null> {
  const [row] = await db
    .select()
    .from(customers)
    .where(eq(customers.email, email.trim().toLowerCase()))
    .limit(1);
  return row ?? null;
}

export async function setCustomerStatus(
  db: Db,
  id: string,
  status: Customer["status"],
): Promise<Customer | null> {
  const [row] = await db
    .update(customers)
    .set({ status, updatedAt: new Date() })
    .where(eq(customers.id, id))
    .returning();
  return row ?? null;
}

export async function getCustomerProfile(db: Db, customerId: string): Promise<CustomerProfile | null> {
  const [row] = await db
    .select()
    .from(customerProfiles)
    .where(eq(customerProfiles.customerId, customerId))
    .limit(1);
  return row ?? null;
}

/** Upserts the Realtor profile JSON for a customer. */
export async function upsertCustomerProfile(
  db: Db,
  customerId: string,
  profile: RealtorProfile,
): Promise<CustomerProfile> {
  const [row] = await db
    .insert(customerProfiles)
    .values({ customerId, profileJson: profile })
    .onConflictDoUpdate({
      target: customerProfiles.customerId,
      set: { profileJson: profile, updatedAt: sql`now()` },
    })
    .returning();
  return row;
}
