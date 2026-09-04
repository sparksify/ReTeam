import { describe, expect, it } from "vitest";
import { normalizeBaseUrl } from "@/lib/base-url";

describe("normalizeBaseUrl", () => {
  it("adds https when the scheme is missing", () => {
    expect(normalizeBaseUrl("reteam-jade.vercel.app")).toBe("https://reteam-jade.vercel.app");
    expect(normalizeBaseUrl("app.reteam.ai/")).toBe("https://app.reteam.ai");
  });
  it("keeps explicit schemes and strips trailing slashes", () => {
    expect(normalizeBaseUrl("https://app.reteam.ai///")).toBe("https://app.reteam.ai");
    expect(normalizeBaseUrl("http://localhost:3000/")).toBe("http://localhost:3000");
  });
  it("uses http for bare localhost", () => {
    expect(normalizeBaseUrl("localhost:3000")).toBe("http://localhost:3000");
  });
  it("returns null for empty values", () => {
    expect(normalizeBaseUrl("")).toBeNull();
    expect(normalizeBaseUrl(undefined)).toBeNull();
    expect(normalizeBaseUrl("  ")).toBeNull();
  });
});
