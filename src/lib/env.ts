import { normalizeBaseUrl } from "./base-url";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable ${name}. See .env.example.`);
  return value;
}

export function appUrl(): string {
  return normalizeBaseUrl(process.env.APP_URL) ?? "http://localhost:3000";
}

export function adminPassword(): string {
  return required("ADMIN_PASSWORD");
}

export function sessionSecret(): string {
  return required("ADMIN_SESSION_SECRET");
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}
