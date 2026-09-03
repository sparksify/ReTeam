import { requireDatabaseUrl } from "./_env";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";

async function main() {
  const url = requireDatabaseUrl();
  const db = drizzle({ client: neon(url) });
  console.log("Applying migrations from ./drizzle ...");
  await migrate(db, { migrationsFolder: "drizzle" });
  console.log("Migrations applied.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
