/**
 * Admin authentication for V1: a single owner password from ADMIN_PASSWORD and
 * an HMAC-signed, expiring session cookie. Web Crypto is used so the same code
 * runs in the request proxy and in server actions.
 */
export const ADMIN_COOKIE = "reteam_admin";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const encoder = new TextEncoder();

async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function verifyPassword(candidate: string, expected: string): Promise<boolean> {
  // Compare HMACs of both values so lengths never leak through timing.
  const salt = "reteam-password-check";
  const [a, b] = await Promise.all([hmacHex(salt, candidate), hmacHex(salt, expected)]);
  return constantTimeEqual(a, b);
}

export async function createSessionValue(secret: string, now = Date.now()): Promise<string> {
  const expires = now + SESSION_TTL_MS;
  const sig = await hmacHex(secret, `admin:${expires}`);
  return `${expires}.${sig}`;
}

export async function verifySessionValue(secret: string, value: string | undefined, now = Date.now()): Promise<boolean> {
  if (!value) return false;
  const [expiresStr, sig] = value.split(".");
  if (!expiresStr || !sig) return false;
  const expires = Number(expiresStr);
  if (!Number.isFinite(expires) || expires < now) return false;
  const expected = await hmacHex(secret, `admin:${expires}`);
  return constantTimeEqual(expected, sig);
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/admin",
  maxAge: SESSION_TTL_MS / 1000,
};
