import { desc, eq } from "drizzle-orm";
import type { Db } from "@/db/client";
import { accessLogs, type AccessLog } from "@/db/schema";
import { hashIp } from "./tokens";

export type AccessEvent = {
  licenseId: string;
  resourceType: string;
  resourceIdentifier?: string | null;
  ip?: string | null;
  userAgent?: string | null;
};

function ipSalt(): string {
  return process.env.ADMIN_SESSION_SECRET ?? "reteam-dev-ip-salt";
}

/** Lightweight, privacy-conscious access log. Never stores raw IPs or tokens. */
export async function recordAccess(db: Db, event: AccessEvent): Promise<void> {
  await db.insert(accessLogs).values({
    licenseId: event.licenseId,
    resourceType: event.resourceType,
    resourceIdentifier: event.resourceIdentifier ?? null,
    ipHash: hashIp(event.ip, ipSalt()),
    userAgent: event.userAgent ? event.userAgent.slice(0, 300) : null,
  });
}

export async function listRecentAccess(db: Db, licenseId: string, limit = 25): Promise<AccessLog[]> {
  return db
    .select()
    .from(accessLogs)
    .where(eq(accessLogs.licenseId, licenseId))
    .orderBy(desc(accessLogs.createdAt))
    .limit(limit);
}

export type CustomerAccessRow = AccessLog & { tokenPrefix: string };

/** Recent access across all of a customer's licenses. */
export async function listRecentAccessForCustomer(db: Db, customerId: string, limit = 30): Promise<CustomerAccessRow[]> {
  const { licenses } = await import("@/db/schema");
  const rows = await db
    .select({ log: accessLogs, tokenPrefix: licenses.tokenPrefix })
    .from(accessLogs)
    .innerJoin(licenses, eq(licenses.id, accessLogs.licenseId))
    .where(eq(licenses.customerId, customerId))
    .orderBy(desc(accessLogs.createdAt))
    .limit(limit);
  return rows.map((r) => ({ ...r.log, tokenPrefix: r.tokenPrefix }));
}
