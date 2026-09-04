import Link from "next/link";
import { Badge, Empty, Table, Td, Th, formatDate } from "@/components/ui";

export type VersionRow = {
  id: string;
  version: number;
  status: string;
  changeNotes: string;
  createdAt: Date;
  publishedAt: Date | null;
};

export function VersionHistory({ versions, hrefFor }: { versions: VersionRow[]; hrefFor: (v: VersionRow) => string }) {
  if (versions.length === 0) return <Empty>No versions yet.</Empty>;
  return (
    <Table>
      <thead>
        <tr>
          <Th>Version</Th>
          <Th>Status</Th>
          <Th>Change notes</Th>
          <Th>Created</Th>
          <Th>Published</Th>
        </tr>
      </thead>
      <tbody>
        {versions.map((v) => (
          <tr key={v.id}>
            <Td>
              <Link href={hrefFor(v)} className="font-medium text-ink-950 hover:underline">
                v{v.version}
              </Link>
            </Td>
            <Td><Badge>{v.status}</Badge></Td>
            <Td className="max-w-md text-ink-600">{v.changeNotes || "—"}</Td>
            <Td className="whitespace-nowrap text-ink-500">{formatDate(v.createdAt)}</Td>
            <Td className="whitespace-nowrap text-ink-500">{formatDate(v.publishedAt)}</Td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}
