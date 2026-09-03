import { guardInstall, json } from "@/lib/install/guard";
import { buildProfile } from "@/lib/install/responses";
import { getCustomerProfile, upsertCustomerProfile } from "@/lib/customers";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ token: string }> };
const MAX_PROFILE_BYTES = 64 * 1024;

export async function GET(request: Request, { params }: Params) {
  const { token } = await params;
  const guard = await guardInstall(request, token, { resourceType: "profile" });
  if (!guard.ok) return guard.response;
  const { db, customer, resources } = guard.ctx;

  const profile = await getCustomerProfile(db, customer.id);
  return json(buildProfile({ resources, profile: profile?.profileJson ?? null, updatedAt: profile?.updatedAt ?? null }));
}

export async function PUT(request: Request, { params }: Params) {
  const { token } = await params;
  const guard = await guardInstall(request, token, { resourceType: "profile_write" });
  if (!guard.ok) return guard.response;
  const { db, customer, resources } = guard.ctx;

  const raw = await request.text();
  if (raw.length > MAX_PROFILE_BYTES) {
    return json({ product: "ReTeam", error: "profile_too_large", message: "Profile must be under 64KB of JSON." }, { status: 413 });
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return json({ product: "ReTeam", error: "invalid_json", message: "Body must be a JSON object." }, { status: 400 });
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return json({ product: "ReTeam", error: "invalid_profile", message: "Body must be a JSON object of profile fields." }, { status: 400 });
  }

  const saved = await upsertCustomerProfile(db, customer.id, parsed as Record<string, unknown>);
  return json({
    ...buildProfile({ resources, profile: saved.profileJson, updatedAt: saved.updatedAt }),
    saved: true,
  });
}

export const POST = PUT;
