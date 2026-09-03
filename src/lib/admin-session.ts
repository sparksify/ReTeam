import { cookies } from "next/headers";
import { ADMIN_COOKIE, verifySessionValue } from "./admin-auth";
import { sessionSecret } from "./env";

export async function isAdminAuthenticated(): Promise<boolean> {
  const store = await cookies();
  return verifySessionValue(sessionSecret(), store.get(ADMIN_COOKIE)?.value);
}

/** Server actions call this so a forged POST can never bypass the proxy. */
export async function requireAdmin(): Promise<void> {
  if (!(await isAdminAuthenticated())) {
    throw new Error("Not authenticated");
  }
}
