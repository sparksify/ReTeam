import Link from "next/link";
import { getDb } from "@/db/client";
import { listAllEmployees } from "@/lib/employees";
import { Badge, Card, Empty, PageHeader, Table, Td, Th } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function EmployeesPage() {
  const rows = await listAllEmployees(await getDb());
  return (
    <>
      <PageHeader
        eyebrow="Employees"
        title="AI employees"
        description="Factory-trained employees are maintained by ReTeam and visible to every customer. Custom employees (future AI Hiring System) belong to one customer."
      />
      <Card>
        {rows.length === 0 ? (
          <Empty>No employees. Run the seed script.</Empty>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Employee</Th>
                <Th>Slug</Th>
                <Th>Category</Th>
                <Th>Type</Th>
                <Th>Status</Th>
                <Th>Live manual</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((e) => (
                <tr key={e.id}>
                  <Td>
                    <Link href={`/admin/employees/${e.id}`} className="font-medium text-ink-950 hover:underline">{e.name}</Link>
                    <p className="mt-0.5 max-w-md text-xs text-ink-500">{e.description}</p>
                  </Td>
                  <Td className="font-mono text-xs">{e.slug}</Td>
                  <Td>{e.category}</Td>
                  <Td><Badge>{e.employeeType}</Badge></Td>
                  <Td><Badge>{e.status}</Badge></Td>
                  <Td>{e.currentVersion ? `v${e.currentVersion}` : <span className="text-clay-700">none</span>}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
