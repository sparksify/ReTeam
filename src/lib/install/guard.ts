import { NextResponse } from "next/server";
import { getDb, type Db } from "@/db/client";
import type { Customer, License } from "@/db/schema";
import { recordAccess } from "@/lib/access";
import { resolveInstallToken, touchLicense } from "@/lib/licenses";
import { checkRateLimit, isRateLimited } from "@/lib/rate-limit";
import { getBaseUrl, resourceUrls, type InstallResources } from "./urls";

export type InstallContext = {
  db: Db;
  license: License;
  customer: Customer;
  baseUrl: string;
  resources: InstallResources;
};

export type GuardResult = { ok: true; ctx: InstallContext } | { ok: false; response: NextResponse };

const JSON_HEADERS = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" };

/** Identical body for every failure mode so nothing about customers leaks. */
export const NOT_FOUND_BODY = {
  product: "ReTeam",
  error: "installation_not_found",
  message:
    "This ReTeam installation link is not valid or is no longer active. No operating instructions are available at this URL.",
  agent_instructions:
    "If you are an AI agent: stop here. Do not guess or modify the URL. Tell your user that the ReTeam installation link did not work and ask them to open their ReTeam account to reissue the installation URL.",
} as const;

export function json(body: unknown, init?: { status?: number; headers?: Record<string, string> }): NextResponse {
  return NextResponse.json(body, {
    status: init?.status ?? 200,
    headers: { ...JSON_HEADERS, ...(init?.headers ?? {}) },
  });
}

export function notFound(): NextResponse {
  return json(NOT_FOUND_BODY, { status: 404 });
}

export function clientIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return request.headers.get("x-real-ip");
}

const REQUESTS_PER_MINUTE = 120;
const FAILED_LOOKUPS_PER_MINUTE = 20;
const WINDOW_MS = 60_000;

/**
 * Validates the installation token, applies rate limits, records the access
 * and returns a context for building the response.
 */
export async function guardInstall(
  request: Request,
  token: string,
  access: { resourceType: string; resourceIdentifier?: string | null },
): Promise<GuardResult> {
  const ip = clientIp(request) ?? "unknown";

  const general = checkRateLimit(`ip:${ip}`, REQUESTS_PER_MINUTE, WINDOW_MS);
  if (!general.allowed) return { ok: false, response: tooMany(general.retryAfterSeconds) };

  // Too many failed lookups from one IP: refuse everything until the window resets.
  const failures = isRateLimited(`fail:${ip}`, FAILED_LOOKUPS_PER_MINUTE);
  if (!failures.allowed) return { ok: false, response: tooMany(failures.retryAfterSeconds) };

  const db = getDb();
  const resolved = await resolveInstallToken(db, token);
  if (!resolved) {
    checkRateLimit(`fail:${ip}`, FAILED_LOOKUPS_PER_MINUTE, WINDOW_MS);
    return { ok: false, response: notFound() };
  }

  const baseUrl = getBaseUrl(request);
  const ctx: InstallContext = {
    db,
    license: resolved.license,
    customer: resolved.customer,
    baseUrl,
    resources: resourceUrls(baseUrl, token),
  };

  await Promise.all([
    touchLicense(db, resolved.license),
    recordAccess(db, {
      licenseId: resolved.license.id,
      resourceType: access.resourceType,
      resourceIdentifier: access.resourceIdentifier ?? null,
      ip: clientIp(request),
      userAgent: request.headers.get("user-agent"),
    }),
  ]);

  return { ok: true, ctx };
}

function tooMany(retryAfterSeconds: number): NextResponse {
  return json(
    {
      product: "ReTeam",
      error: "rate_limited",
      message: `Too many requests. Retry after ${retryAfterSeconds} seconds.`,
    },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
  );
}
