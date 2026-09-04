import { DocumentVersionPage } from "@/components/admin/document-pages";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <DocumentVersionPage kind="chief_of_staff" id={id} />;
}
