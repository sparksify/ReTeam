import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema";

/**
 * Driver-agnostic database handle. Production uses the Neon serverless HTTP
 * driver; tests use PGlite with the exact same schema and migrations.
 */
export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

// Cached on globalThis so every server bundle (dev mode compiles routes
// separately) shares one connection — essential for the embedded PGlite mode.
const globalCache = globalThis as unknown as { __reteamDb?: Promise<Db>; __reteamDbOverride?: Db | null };

/**
 * Returns the application database.
 *
 *  - `postgres://` / `postgresql://` → Neon serverless HTTP driver (production)
 *  - `pglite://<directory>`          → embedded PGlite, migrations applied on
 *                                      first use (local development only)
 */
export function getDb(): Promise<Db> {
  if (globalCache.__reteamDbOverride) return Promise.resolve(globalCache.__reteamDbOverride);
  if (globalCache.__reteamDb) return globalCache.__reteamDb;
  const url = process.env.DATABASE_URL;
  if (!url) {
    return Promise.reject(new Error("DATABASE_URL is not set. See .env.example."));
  }
  globalCache.__reteamDb = url.startsWith("pglite://")
    ? createPgliteDb(url.slice("pglite://".length))
    : Promise.resolve(createNeonDb(url));
  return globalCache.__reteamDb;
}

function createNeonDb(url: string): Db {
  return drizzleNeon({ client: neon(url), schema }) as unknown as Db;
}

async function createPgliteDb(directory: string): Promise<Db> {
  if (process.env.NODE_ENV === "production") {
    throw new Error("pglite:// database URLs are for local development only.");
  }
  const [{ PGlite }, { drizzle }, { migrate }, path] = await Promise.all([
    import("@electric-sql/pglite"),
    import("drizzle-orm/pglite"),
    import("drizzle-orm/pglite/migrator"),
    import("node:path"),
  ]);
  const client = new PGlite(directory || undefined);
  const db = drizzle({ client, schema });
  await migrate(db, { migrationsFolder: path.resolve(process.cwd(), "drizzle") });
  return db as unknown as Db;
}

/** Test hook: route all application code through an in-process database. */
export function setDbOverride(db: Db | null): void {
  globalCache.__reteamDbOverride = db;
}

export { schema };
