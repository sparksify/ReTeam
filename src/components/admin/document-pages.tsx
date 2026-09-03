import { notFound } from "next/navigation";
import { getDb } from "@/db/client";
import { DOC_LABELS, getDocumentVersion, getPublishedDocument, listDocumentVersions, type DocKind } from "@/lib/documents";
import { Button, Card, PageHeader } from "@/components/ui";
import { VersionHistory } from "./version-history";
import { PublishedBanner } from "./published-banner";
import { VersionEditor } from "./version-editor";
import { VersionView } from "./version-view";
import { createDocumentDraftAction, publishDocumentAction, saveDocumentDraftAction } from "@/app/admin/actions";

const PATHS: Record<DocKind, string> = { chief_of_staff: "/admin/chief-of-staff", standards: "/admin/standards" };
const DESCRIPTIONS: Record<DocKind, string> = {
  chief_of_staff:
    "The operating manual every installed Chief of Staff retrieves from the company resource. Publishing a new version updates all installations.",
  standards:
    "Company-wide standards inherited by every employee. Retrieved from the standards resource by every installation.",
};

export async function DocumentIndexPage({ kind, published }: { kind: DocKind; published?: string }) {
  const db = await getDb();
  const [versions, current] = await Promise.all([listDocumentVersions(db, kind), getPublishedDocument(db, kind)]);
  const hasDraft = versions.some((v) => v.status === "draft");
  return (
    <>
      <PageHeader
        eyebrow="Company documents"
        title={DOC_LABELS[kind]}
        description={`${DESCRIPTIONS[kind]} Live version: ${current ? `v${current.version}` : "none published"}.`}
        actions={
          <form action={createDocumentDraftAction}>
            <input type="hidden" name="kind" value={kind} />
            <Button type="submit" variant="accent">New version</Button>
          </form>
        }
      />
      <PublishedBanner version={published} />
      {hasDraft ? (
        <p className="mb-6 rounded-md border border-brass-500/40 bg-brass-50 px-4 py-3 text-sm text-brass-700">
          A draft version exists. Open it from the history below to continue editing or publish it.
        </p>
      ) : null}
      <Card title="Version history">
        <VersionHistory versions={versions} hrefFor={(v) => `${PATHS[kind]}/versions/${v.id}`} />
      </Card>
      {current ? (
        <Card className="mt-6" title={`Live content (v${current.version})`}>
          <VersionView {...current} />
        </Card>
      ) : null}
    </>
  );
}

export async function DocumentVersionPage({ kind, id }: { kind: DocKind; id: string }) {
  const version = await getDocumentVersion(await getDb(), kind, id);
  if (!version) notFound();
  return (
    <>
      <PageHeader
        eyebrow={DOC_LABELS[kind]}
        title={`Version ${version.version}`}
        description={version.status === "draft" ? "Draft — not visible to any installation until published." : undefined}
      />
      <Card>
        {version.status === "draft" ? (
          <VersionEditor
            hidden={{ kind, versionId: version.id }}
            initialContent={version.content}
            initialChangeNotes={version.changeNotes}
            saveAction={saveDocumentDraftAction}
            publishAction={publishDocumentAction}
          />
        ) : (
          <VersionView {...version} />
        )}
      </Card>
    </>
  );
}
