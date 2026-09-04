import { DocumentIndexPage } from "@/components/admin/document-pages";

export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<{ published?: string }> }) {
  const { published } = await searchParams;
  return <DocumentIndexPage kind="standards" published={published} />;
}
