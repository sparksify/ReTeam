import { requireDatabaseUrl } from "./_env";
import { getDb } from "@/db/client";

async function main() {
  const url = requireDatabaseUrl();
  if (url.startsWith("pglite://")) {
    await getDb(); // PGlite applies ./drizzle migrations on first connection
    console.log("Local PGlite database migrated.");
    return;
  }
  const [{ neon }, { drizzle }, { migrate }] = await Promise.all([
    import("@neondatabase/serverless"),
    import("drizzle-orm/neon-http"),
    import("drizzle-orm/neon-http/migrator"),
  ]);
  const db = drizzle({ client: neon(url) });
  console.log("Applying migrations from ./drizzle to Neon ...");
  await migrate(db, { migrationsFolder: "drizzle" });
  console.log("Migrations applied.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
