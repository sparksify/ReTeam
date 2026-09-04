import { config } from "dotenv";

// Load .env.local (Next.js convention) first, then .env. Existing vars win.
config({ path: ".env.local" });
config({ path: ".env" });

export function requireDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.");
    process.exit(1);
  }
  return url;
}
