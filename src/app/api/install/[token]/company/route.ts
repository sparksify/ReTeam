import { guardInstall, json } from "@/lib/install/guard";
import { buildCompany } from "@/lib/install/responses";
import { getPublishedDocument } from "@/lib/documents";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ token: string }> };

export async function GET(request: Request, { params }: Params) {
  const { token } = await params;
  const guard = await guardInstall(request, token, { resourceType: "company" });
  if (!guard.ok) return guard.response;
  const { db, resources } = guard.ctx;

  const manual = await getPublishedDocument(db, "chief_of_staff");
  if (!manual) {
    return json(
      { product: "ReTeam", error: "not_published", message: "The Chief of Staff manual has not been published yet. Contact ReTeam." },
      { status: 503 },
    );
  }
  return json(buildCompany({ resources, manual }));
}
