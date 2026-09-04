import { guardInstall, json } from "@/lib/install/guard";
import { buildStandards } from "@/lib/install/responses";
import { getPublishedDocument } from "@/lib/documents";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ token: string }> };

export async function GET(request: Request, { params }: Params) {
  const { token } = await params;
  const guard = await guardInstall(request, token, { resourceType: "standards" });
  if (!guard.ok) return guard.response;
  const { db, resources } = guard.ctx;

  const standards = await getPublishedDocument(db, "standards");
  if (!standards) {
    return json(
      { product: "ReTeam", error: "not_published", message: "The Global Operating Standards have not been published yet. Contact ReTeam." },
      { status: 503 },
    );
  }
  return json(buildStandards({ resources, standards }));
}
