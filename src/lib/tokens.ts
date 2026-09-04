import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Installation token format: "rt_" + 43 base64url characters (32 random bytes,
 * 256 bits of entropy). Tokens are URL-safe and contain no customer data.
 */
export const TOKEN_PREFIX_TAG = "rt_";
const TOKEN_BODY_LENGTH = 43;
const TOKEN_PATTERN = /^rt_[A-Za-z0-9_-]{43}$/;
/** Characters of the raw token kept in plaintext purely for identification in admin. */
export const TOKEN_DISPLAY_PREFIX_LENGTH = 11;

export function generateInstallToken(): string {
  const body = randomBytes(32).toString("base64url");
  if (body.length !== TOKEN_BODY_LENGTH) {
    throw new Error("Unexpected token body length");
  }
  return `${TOKEN_PREFIX_TAG}${body}`;
}

/** Cheap syntactic check so garbage never reaches the database. */
export function isPlausibleToken(candidate: unknown): candidate is string {
  return typeof candidate === "string" && TOKEN_PATTERN.test(candidate);
}

/** SHA-256 hex digest. The raw token has 256 bits of entropy, so a plain hash is sufficient. */
export function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken, "utf8").digest("hex");
}

export function tokenDisplayPrefix(rawToken: string): string {
  return rawToken.slice(0, TOKEN_DISPLAY_PREFIX_LENGTH);
}

/** Constant-time comparison of two hex digests. */
export function hashesEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

/** Salted hash of a client IP for access logs. Raw IPs are never persisted. */
export function hashIp(ip: string | null | undefined, salt: string): string | null {
  if (!ip) return null;
  return createHmac("sha256", salt).update(ip).digest("hex").slice(0, 32);
}

/** Redacts anything that looks like an installation token from free text (for logs). */
export function redactTokens(text: string): string {
  return text.replace(/rt_[A-Za-z0-9_-]{43}/g, "rt_[redacted]");
}
