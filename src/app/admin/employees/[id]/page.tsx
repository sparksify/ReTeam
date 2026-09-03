import { notFound } from "next/navigation";
import { getDb } from "@/db/client";
import { getEmployeeById, listManualVersions } from "@/lib/employees";
import { Badge, Button, Card, PageHeader } from "@/components/ui";
import { VersionHistory } from "@/components/admin/version-history";
import { createManualDraftAction } from "../../actions";
import { EmployeeForm } from "./employee-form";

export const dynamic = "force-dynamic";

export default async function EmployeePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getDb();
  const employee = await getEmployeeById(db, id);
  if (!employee) notFound();
  const versions = await listManualVersions(db, id);
  const hasDraft = versions.some((v) => v.status === "draft");

  return (
    <>
      <PageHeader
        eyebrow="Employee"
        title={employee.name}
        description={
          <>
            <span className="font-mono text-xs">{employee.slug}</span> · <Badge>{employee.employeeType}</Badge>{" "}
            <Badge>{employee.status}</Badge> · live manual {employee.currentVersion ? `v${employee.currentVersion}` : "none"}
          </>
        }
        actions={
          <form action={createManualDraftAction}>
            <input type="hidden" name="employeeId" value={employee.id} />
            <Button type="submit" variant="accent">New manual version</Button>
          </form>
        }
      />
      {hasDraft ? (
        <p className="mb-6 rounded-md border border-brass-500/40 bg-brass-50 px-4 py-3 text-sm text-brass-700">
          A draft version exists. Open it from the history below to continue editing or publish it.
        </p>
      ) : null}
      <Card title="Manual version history">
        <VersionHistory versions={versions} hrefFor={(v) => `/admin/employees/${employee.id}/versions/${v.id}`} />
      </Card>
      <Card className="mt-6" title="Metadata (shown in the employee catalog)">
        <EmployeeForm employee={employee} />
      </Card>
    </>
  );
}
