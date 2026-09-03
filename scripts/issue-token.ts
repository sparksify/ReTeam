/**
 * Issues a fresh installation token.
 *
 *   npm run token:test                      -> test customer (created if missing)
 *   npm run token:issue -- --email a@b.com  -> existing customer by email
 *
 * The raw token is printed ONCE and never stored.
 */
import { requireDatabaseUrl } from "./_env";
import { getDb } from "@/db/client";
import { appUrl } from "@/lib/env";
import { getCustomerByEmail } from "@/lib/customers";
import { issueLicense } from "@/lib/licenses";
import { issueTestLicense } from "@/lib/seed";

async function main() {
  requireDatabaseUrl();
  const db = await getDb();
  const args = process.argv.slice(2);
  const emailIdx = args.indexOf("--email");

  let customerLabel: string;
  let rawToken: string;

  if (args.includes("--test-customer")) {
    const { customer, issued } = await issueTestLicense(db);
    customerLabel = `${customer.name} <${customer.email}>`;
    rawToken = issued.rawToken;
  } else if (emailIdx !== -1 && args[emailIdx + 1]) {
    const customer = await getCustomerByEmail(db, args[emailIdx + 1]);
    if (!customer) {
      console.error("No customer with that email. Create one in /admin/customers first.");
      process.exit(1);
    }
    const issued = await issueLicense(db, customer.id);
    customerLabel = `${customer.name} <${customer.email}>`;
    rawToken = issued.rawToken;
  } else {
    console.error("Usage: npm run token:test   |   npm run token:issue -- --email <customer email>");
    process.exit(1);
  }

  const url = `${appUrl()}/install/${rawToken}`;
  console.log("");
  console.log(`Installation token issued for ${customerLabel}`);
  console.log("This URL is shown once. It is not stored anywhere.");
  console.log("");
  console.log(url);
  console.log("");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
