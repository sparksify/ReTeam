import Link from "next/link";
import { getDb } from "@/db/client";
import { listCustomers } from "@/lib/customers";
import { Badge, Card, Empty, LinkButton, PageHeader, Table, Td, Th, formatDate } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const rows = await listCustomers(await getDb());
  return (
    <>
      <PageHeader
        eyebrow="Customers"
        title="Customers & licenses"
        description="Each customer receives private installation tokens. Disabling a customer immediately blocks every token they hold."
        actions={<LinkButton href="/admin/customers/new" variant="primary">New customer</LinkButton>}
      />
      <Card>
        {rows.length === 0 ? (
          <Empty>No customers yet. Create one to issue an installation token.</Empty>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Name</Th>
                <Th>Email</Th>
                <Th>Company</Th>
                <Th>Status</Th>
                <Th>Created</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id}>
                  <Td>
                    <Link href={`/admin/customers/${c.id}`} className="font-medium text-ink-950 hover:underline">
                      {c.name}
                    </Link>
                  </Td>
                  <Td>{c.email}</Td>
                  <Td>{c.companyName ?? "—"}</Td>
                  <Td><Badge>{c.status}</Badge></Td>
                  <Td className="whitespace-nowrap text-ink-500">{formatDate(c.createdAt)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
