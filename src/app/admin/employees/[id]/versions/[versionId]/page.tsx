import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/db/client";
import { getEmployeeById, getManualVersion } from "@/lib/employees";
import { Card, PageHeader } from "@/components/ui";
import { VersionEditor } from "@/components/admin/version-editor";
import { VersionView } from "@/components/admin/version-view";
import { publishManualAction, saveManualDraftAction } from "../../../../actions";

export const dynamic = "force-dynamic";

export default async function ManualVersionPage({ params }: { params: Promise<{ id: string; versionId: string }> }) {
  const { id, versionId } = await params;
  const db = await getDb();
  const [employee, version] = await Promise.all([getEmployeeById(db, id), getManualVersion(db, versionId)]);
  if (!employee || !version || version.employeeId !== employee.id) notFound();

  return (
    <>
      <PageHeader
        eyebrow={<Link href={`/admin/employees/${employee.id}`} className="hover:underline">{employee.name}</Link>}
        title={`Manual v${version.version}`}
        description={version.status === "draft" ? "Draft — not visible to any installation until published." : undefined}
      />
      <Card>
        {version.status === "draft" ? (
          <VersionEditor
            hidden={{ versionId: version.id }}
            initialContent={version.content}
            initialChangeNotes={version.changeNotes}
            saveAction={saveManualDraftAction}
            publishAction={publishManualAction}
          />
        ) : (
          <VersionView {...version} />
        )}
      </Card>
    </>
  );
}
