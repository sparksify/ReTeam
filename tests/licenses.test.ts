import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/db/client";
import { licenses } from "@/db/schema";
import { createCustomer, setCustomerStatus } from "@/lib/customers";
import { issueLicense, resolveInstallToken, revokeLicense, rotateLicense } from "@/lib/licenses";
import { generateInstallToken, hashToken } from "@/lib/tokens";
import { bootTestApp } from "./helpers/setup";

let db: Db;
let close: () => Promise<void>;

beforeAll(async () => {
  ({ db, close } = await bootTestApp());
});
afterAll(() => close());

describe("licenses", () => {
  it("stores only the hash and a prefix, never the raw token", async () => {
    const customer = await createCustomer(db, { email: "a@example.com", name: "Agent A" });
    const { license, rawToken } = await issueLicense(db, customer.id);
    const [row] = await db.select().from(licenses).where(eq(licenses.id, license.id));
    expect(row.tokenHash).toBe(hashToken(rawToken));
    expect(row.tokenPrefix).toBe(rawToken.slice(0, 11));
    expect(JSON.stringify(row)).not.toContain(rawToken);
  });

  it("resolves a valid token to its active license and customer", async () => {
    const customer = await createCustomer(db, { email: "b@example.com", name: "Agent B" });
    const { rawToken } = await issueLicense(db, customer.id);
    const resolved = await resolveInstallToken(db, rawToken);
    expect(resolved?.customer.id).toBe(customer.id);
    expect(resolved?.license.status).toBe("active");
  });

  it("rejects unknown and malformed tokens", async () => {
    expect(await resolveInstallToken(db, generateInstallToken())).toBeNull();
    expect(await resolveInstallToken(db, "not-a-token")).toBeNull();
    expect(await resolveInstallToken(db, undefined)).toBeNull();
  });

  it("rejects revoked tokens", async () => {
    const customer = await createCustomer(db, { email: "c@example.com", name: "Agent C" });
    const { license, rawToken } = await issueLicense(db, customer.id);
    expect(await resolveInstallToken(db, rawToken)).not.toBeNull();
    const revoked = await revokeLicense(db, license.id);
    expect(revoked?.status).toBe("revoked");
    expect(revoked?.revokedAt).toBeInstanceOf(Date);
    expect(await resolveInstallToken(db, rawToken)).toBeNull();
  });

  it("rejects tokens of disabled customers", async () => {
    const customer = await createCustomer(db, { email: "d@example.com", name: "Agent D" });
    const { rawToken } = await issueLicense(db, customer.id);
    await setCustomerStatus(db, customer.id, "disabled");
    expect(await resolveInstallToken(db, rawToken)).toBeNull();
    await setCustomerStatus(db, customer.id, "active");
    expect(await resolveInstallToken(db, rawToken)).not.toBeNull();
  });

  it("rotates: old token dies, new token works, link recorded", async () => {
    const customer = await createCustomer(db, { email: "e@example.com", name: "Agent E" });
    const { license, rawToken } = await issueLicense(db, customer.id);
    const rotated = await rotateLicense(db, license.id);
    expect(rotated).not.toBeNull();
    expect(rotated!.rawToken).not.toBe(rawToken);
    expect(await resolveInstallToken(db, rawToken)).toBeNull();
    expect((await resolveInstallToken(db, rotated!.rawToken))?.customer.id).toBe(customer.id);
    const [old] = await db.select().from(licenses).where(eq(licenses.id, license.id));
    expect(old.status).toBe("revoked");
    expect(old.replacedByLicenseId).toBe(rotated!.license.id);
  });
});
