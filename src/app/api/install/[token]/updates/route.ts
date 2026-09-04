import { guardInstall, json } from "@/lib/install/guard";
import { loadCatalog } from "@/lib/install/catalog";
import { buildUpdates } from "@/lib/install/responses";
import { getPublishedDocument } from "@/lib/documents";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ token: string }> };

export async function GET(request: Request, { params }: Params) {
  const { token } = await params;
  const guard = await guardInstall(request, token, { resourceType: "updates" });
  if (!guard.ok) return guard.response;
  const { db, customer, resources } = guard.ctx;

  const [companyManual, standards, entries] = await Promise.all([
    getPublishedDocument(db, "chief_of_staff"),
    getPublishedDocument(db, "standards"),
    loadCatalog(db, customer.id),
  ]);
  return json(buildUpdates({ resources, companyManual, standards, entries }));
}
