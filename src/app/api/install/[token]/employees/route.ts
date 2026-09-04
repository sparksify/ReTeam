import { guardInstall, json } from "@/lib/install/guard";
import { loadCatalog } from "@/lib/install/catalog";
import { buildEmployeeCatalog } from "@/lib/install/responses";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ token: string }> };

export async function GET(request: Request, { params }: Params) {
  const { token } = await params;
  const guard = await guardInstall(request, token, { resourceType: "employees" });
  if (!guard.ok) return guard.response;
  const { db, customer, resources } = guard.ctx;

  const entries = await loadCatalog(db, customer.id);
  return json(buildEmployeeCatalog({ resources, entries }));
}
