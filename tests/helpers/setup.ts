import { setDbOverride, type Db } from "@/db/client";
import { seedFactoryContent } from "@/lib/seed";
import { resetRateLimits } from "@/lib/rate-limit";
import { createTestDb } from "./db";

export const TEST_BASE_URL = "https://reteam.test";

/** Fresh PGlite database with factory content seeded, wired into the app. */
export async function bootTestApp(): Promise<{ db: Db; close: () => Promise<void> }> {
  process.env.APP_URL = TEST_BASE_URL;
  process.env.ADMIN_SESSION_SECRET = "test-secret";
  const { db, close } = await createTestDb();
  await seedFactoryContent(db);
  setDbOverride(db);
  resetRateLimits();
  return {
    db,
    close: async () => {
      setDbOverride(null);
      await close();
    },
  };
}

export function params<T extends Record<string, string>>(p: T): { params: Promise<T> } {
  return { params: Promise.resolve(p) };
}

export function req(url: string, init?: RequestInit & { ip?: string }): Request {
  const headers = new Headers(init?.headers);
  headers.set("x-forwarded-for", init?.ip ?? "203.0.113.10");
  headers.set("user-agent", "vitest");
  return new Request(url, { ...init, headers });
}
