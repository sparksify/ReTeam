import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import path from "node:path";
import type { Db } from "@/db/client";
import * as schema from "@/db/schema";

/** In-process Postgres (PGlite) with the real migrations applied. */
export async function createTestDb(): Promise<{ db: Db; close: () => Promise<void> }> {
  const client = new PGlite();
  const db = drizzle({ client, schema });
  await migrate(db, { migrationsFolder: path.resolve(process.cwd(), "drizzle") });
  return { db: db as unknown as Db, close: () => client.close() };
}
