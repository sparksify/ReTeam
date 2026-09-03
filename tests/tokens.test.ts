import { describe, expect, it } from "vitest";
import {
  generateInstallToken,
  hashIp,
  hashToken,
  hashesEqual,
  isPlausibleToken,
  redactTokens,
  tokenDisplayPrefix,
} from "@/lib/tokens";

describe("installation tokens", () => {
  it("generates URL-safe tokens with 256 bits of entropy and the rt_ tag", () => {
    const token = generateInstallToken();
    expect(token).toMatch(/^rt_[A-Za-z0-9_-]{43}$/);
    expect(encodeURIComponent(token)).toBe(token);
  });

  it("never repeats", () => {
    const seen = new Set(Array.from({ length: 500 }, () => generateInstallToken()));
    expect(seen.size).toBe(500);
  });

  it("hashes deterministically and irreversibly", () => {
    const token = generateInstallToken();
    const hash = hashToken(token);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).toBe(hashToken(token));
    expect(hash).not.toContain(token.slice(3, 20));
    expect(hashToken(generateInstallToken())).not.toBe(hash);
  });

  it("compares hashes in constant time helper", () => {
    const h = hashToken("rt_x");
    expect(hashesEqual(h, h)).toBe(true);
    expect(hashesEqual(h, hashToken("rt_y"))).toBe(false);
    expect(hashesEqual(h, h.slice(1))).toBe(false);
  });

  it("rejects malformed candidates before any database work", () => {
    expect(isPlausibleToken(generateInstallToken())).toBe(true);
    expect(isPlausibleToken("")).toBe(false);
    expect(isPlausibleToken("abc123")).toBe(false);
    expect(isPlausibleToken("rt_" + "a".repeat(42))).toBe(false);
    expect(isPlausibleToken("rt_" + "a".repeat(44))).toBe(false);
    expect(isPlausibleToken("rt_" + "a".repeat(42) + "!")).toBe(false);
    expect(isPlausibleToken(null)).toBe(false);
    expect(isPlausibleToken(42)).toBe(false);
  });

  it("keeps only a short display prefix", () => {
    const token = generateInstallToken();
    expect(tokenDisplayPrefix(token)).toHaveLength(11);
    expect(token.startsWith(tokenDisplayPrefix(token))).toBe(true);
  });

  it("hashes IPs with a salt and never returns the raw IP", () => {
    const a = hashIp("203.0.113.5", "salt-a");
    expect(a).toMatch(/^[0-9a-f]{32}$/);
    expect(a).not.toBe(hashIp("203.0.113.5", "salt-b"));
    expect(hashIp(null, "salt")).toBeNull();
  });

  it("redacts tokens from log text", () => {
    const token = generateInstallToken();
    expect(redactTokens(`GET /install/${token} 200`)).toBe("GET /install/rt_[redacted] 200");
  });
});
