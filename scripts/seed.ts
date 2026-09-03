import { requireDatabaseUrl } from "./_env";
import { getDb } from "@/db/client";
import { ensureTestCustomer, seedFactoryContent } from "@/lib/seed";

async function main() {
  requireDatabaseUrl();
  const db = getDb();
  const report = await seedFactoryContent(db);
  console.log("Factory content seeded:");
  console.log(`  employees created:  ${report.employeesCreated.join(", ") || "(none)"}`);
  console.log(`  employees updated:  ${report.employeesUpdated.join(", ") || "(none)"}`);
  console.log(`  manuals seeded:     ${report.manualsSeeded.join(", ") || "(none)"}`);
  console.log(`  chief of staff v1:  ${report.chiefOfStaffSeeded ? "seeded" : "already present"}`);
  console.log(`  standards v1:       ${report.standardsSeeded ? "seeded" : "already present"}`);
  if (process.argv.includes("--with-test-customer")) {
    const customer = await ensureTestCustomer(db);
    console.log(`Test customer ready: ${customer.email} (${customer.id})`);
    console.log("Run `npm run token:test` to issue a fresh installation URL for it.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
