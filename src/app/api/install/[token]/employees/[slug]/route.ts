import { guardInstall, json } from "@/lib/install/guard";
import { buildEmployeeManual } from "@/lib/install/responses";
import { getEmployeeBySlugForCustomer, getPublishedManual } from "@/lib/employees";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ token: string; slug: string }> };

export async function GET(request: Request, { params }: Params) {
  const { token, slug } = await params;
  const guard = await guardInstall(request, token, { resourceType: "employee_manual", resourceIdentifier: slug });
  if (!guard.ok) return guard.response;
  const { db, customer, resources } = guard.ctx;

  const employee = await getEmployeeBySlugForCustomer(db, slug, customer.id);
  if (!employee) {
    return json(
      {
        product: "ReTeam",
        error: "employee_not_found",
        message: `No employee with slug "${slug}" is available to this company. Fetch the employee catalog for valid slugs.`,
        employees_url: resources.employees,
      },
      { status: 404 },
    );
  }

  const manual = await getPublishedManual(db, employee.id);
  if (!manual) {
    return json(
      {
        product: "ReTeam",
        error: "manual_not_published",
        message: `The ${employee.name} does not have a published operating manual yet. Tell the Realtor this specialist is not ready.`,
        employees_url: resources.employees,
      },
      { status: 404 },
    );
  }

  return json(buildEmployeeManual({ resources, entry: { employee, manual } }));
}
