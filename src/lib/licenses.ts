import { and, desc, eq } from "drizzle-orm";
import type { Db } from "@/db/client";
import { customers, licenses, type Customer, type License } from "@/db/schema";
import {
  generateInstallToken,
  hashToken,
  hashesEqual,
  isPlausibleToken,
  tokenDisplayPrefix,
} from "./tokens";

export type IssuedLicense = { license: License; rawToken: string };

/**
 * Creates a new active license for a customer and returns the raw token ONCE.
 * Only the SHA-256 hash and a short display prefix are stored.
 */
export async function issueLicense(db: Db, customerId: string): Promise<IssuedLicense> {
  const rawToken = generateInstallToken();
  const [license] = await db
    .insert(licenses)
    .values({
      customerId,
      tokenHash: hashToken(rawToken),
      tokenPrefix: tokenDisplayPrefix(rawToken),
    })
    .returning();
  return { license, rawToken };
}

export async function revokeLicense(db: Db, licenseId: string): Promise<License | null> {
  const [row] = await db
    .update(licenses)
    .set({ status: "revoked", revokedAt: new Date() })
    .where(and(eq(licenses.id, licenseId), eq(licenses.status, "active")))
    .returning();
  return row ?? null;
}

/** Revokes the given license and issues a fresh one for the same customer. */
export async function rotateLicense(db: Db, licenseId: string): Promise<IssuedLicense | null> {
  const [existing] = await db.select().from(licenses).where(eq(licenses.id, licenseId)).limit(1);
  if (!existing) return null;
  const issued = await issueLicense(db, existing.customerId);
  await db
    .update(licenses)
    .set({ status: "revoked", revokedAt: new Date(), replacedByLicenseId: issued.license.id })
    .where(eq(licenses.id, licenseId));
  return issued;
}

export async function listLicensesForCustomer(db: Db, customerId: string): Promise<License[]> {
  return db
    .select()
    .from(licenses)
    .where(eq(licenses.customerId, customerId))
    .orderBy(desc(licenses.createdAt));
}

export type ResolvedInstall = { license: License; customer: Customer };

/**
 * Resolves a raw installation token to an active license + active customer.
 * Returns null for ANY failure (malformed, unknown, revoked, disabled customer)
 * so callers cannot distinguish the cases and leak customer existence.
 */
export async function resolveInstallToken(db: Db, rawToken: unknown): Promise<ResolvedInstall | null> {
  if (!isPlausibleToken(rawToken)) return null;
  const tokenHash = hashToken(rawToken);
  const rows = await db
    .select({ license: licenses, customer: customers })
    .from(licenses)
    .innerJoin(customers, eq(customers.id, licenses.customerId))
    .where(eq(licenses.tokenHash, tokenHash))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  if (!hashesEqual(row.license.tokenHash, tokenHash)) return null;
  if (row.license.status !== "active") return null;
  if (row.customer.status !== "active") return null;
  return row;
}

/** Marks first activation and last access. Cheap single UPDATE. */
export async function touchLicense(db: Db, license: License): Promise<void> {
  const now = new Date();
  await db
    .update(licenses)
    .set({ lastAccessedAt: now, activatedAt: license.activatedAt ?? now })
    .where(eq(licenses.id, license.id));
}
