import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema";

/**
 * Driver-agnostic database handle. Production uses the Neon serverless HTTP
 * driver; tests use PGlite with the exact same schema and migrations.
 */
export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

let cached: Db | null = null;

export function getDb(): Db {
  if (cached) return cached;
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set. See .env.example.");
  }
  cached = drizzle({ client: neon(url), schema }) as unknown as Db;
  return cached;
}

export { schema };
