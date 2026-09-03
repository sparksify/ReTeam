import { describe, expect, it } from "vitest";
import { createSessionValue, verifyPassword, verifySessionValue } from "@/lib/admin-auth";

describe("admin auth", () => {
  it("verifies passwords without leaking length", async () => {
    expect(await verifyPassword("correct horse", "correct horse")).toBe(true);
    expect(await verifyPassword("correct horse!", "correct horse")).toBe(false);
    expect(await verifyPassword("", "correct horse")).toBe(false);
  });

  it("signs and verifies session cookies, rejecting tampering and expiry", async () => {
    const secret = "s3cret";
    const value = await createSessionValue(secret);
    expect(await verifySessionValue(secret, value)).toBe(true);
    expect(await verifySessionValue("other", value)).toBe(false);
    expect(await verifySessionValue(secret, value.replace(/.$/, (c) => (c === "a" ? "b" : "a")))).toBe(false);
    const [expires, sig] = value.split(".");
    expect(await verifySessionValue(secret, `${Number(expires) + 1000}.${sig}`)).toBe(false);
    expect(await verifySessionValue(secret, value, Date.now() + 8 * 24 * 3600 * 1000)).toBe(false);
    expect(await verifySessionValue(secret, undefined)).toBe(false);
    expect(await verifySessionValue(secret, "garbage")).toBe(false);
  });
});
