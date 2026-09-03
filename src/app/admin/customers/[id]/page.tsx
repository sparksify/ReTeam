import { notFound } from "next/navigation";
import { getDb } from "@/db/client";
import { listRecentAccessForCustomer } from "@/lib/access";
import { getCustomer, getCustomerProfile } from "@/lib/customers";
import { listLicensesForCustomer } from "@/lib/licenses";
import { Badge, Button, Card, Empty, Mono, PageHeader, Table, Td, Th, formatDate } from "@/components/ui";
import { revokeLicenseAction, setCustomerStatusAction } from "../../actions";
import { TokenPanel } from "./token-panel";

export const dynamic = "force-dynamic";

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getDb();
  const customer = await getCustomer(db, id);
  if (!customer) notFound();
  const [licenses, profile, access] = await Promise.all([
    listLicensesForCustomer(db, id),
    getCustomerProfile(db, id),
    listRecentAccessForCustomer(db, id),
  ]);
  const activeLicenses = licenses.filter((l) => l.status === "active");

  return (
    <>
      <PageHeader
        eyebrow="Customer"
        title={customer.name}
        description={
          <>
            {customer.email}
            {customer.companyName ? <> · {customer.companyName}</> : null} · created {formatDate(customer.createdAt)}
          </>
        }
        actions={
          <>
            <Badge>{customer.status}</Badge>
            <form action={setCustomerStatusAction}>
              <input type="hidden" name="customerId" value={customer.id} />
              <input type="hidden" name="status" value={customer.status === "active" ? "disabled" : "active"} />
              <Button type="submit" variant={customer.status === "active" ? "danger" : "secondary"}>
                {customer.status === "active" ? "Disable customer" : "Re-enable customer"}
              </Button>
            </form>
          </>
        }
      />

      {customer.status === "disabled" ? (
        <p className="mb-6 rounded-md border border-clay-700/30 bg-clay-100 px-4 py-3 text-sm text-clay-700">
          This customer is disabled. All of their installation tokens are refused until re-enabled.
        </p>
      ) : null}

      <TokenPanel customerId={customer.id} activeLicenses={activeLicenses.map((l) => ({ id: l.id, tokenPrefix: l.tokenPrefix }))} />

      <Card className="mt-6" title="Installation tokens">
        {licenses.length === 0 ? (
          <Empty>No tokens issued yet.</Empty>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Token</Th>
                <Th>Status</Th>
                <Th>Issued</Th>
                <Th>Activated</Th>
                <Th>Last access</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {licenses.map((l) => (
                <tr key={l.id}>
                  <Td><Mono>{l.tokenPrefix}…</Mono></Td>
                  <Td>
                    <Badge>{l.status}</Badge>
                    {l.replacedByLicenseId ? <span className="ml-2 text-xs text-ink-500">rotated</span> : null}
                  </Td>
                  <Td className="whitespace-nowrap text-ink-500">{formatDate(l.createdAt)}</Td>
                  <Td className="whitespace-nowrap text-ink-500">{formatDate(l.activatedAt)}</Td>
                  <Td className="whitespace-nowrap text-ink-500">{formatDate(l.lastAccessedAt)}</Td>
                  <Td>
                    {l.status === "active" ? (
                      <div className="flex justify-end gap-2">
                        <form action={revokeLicenseAction}>
                          <input type="hidden" name="licenseId" value={l.id} />
                          <input type="hidden" name="customerId" value={customer.id} />
                          <Button type="submit" variant="danger" className="px-2.5 py-1 text-xs">Revoke</Button>
                        </form>
                      </div>
                    ) : null}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
        {activeLicenses.length > 1 ? (
          <p className="mt-3 text-xs text-ink-500">This customer holds more than one active token. Revoke any that are no longer needed.</p>
        ) : null}
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card title="Recent access">
          {access.length === 0 ? (
            <Empty>No installation access recorded yet.</Empty>
          ) : (
            <ul className="divide-y divide-ink-100 text-sm">
              {access.map((a) => (
                <li key={a.id} className="flex items-start justify-between gap-4 py-2">
                  <div>
                    <span className="font-medium text-ink-900">{a.resourceType}</span>
                    {a.resourceIdentifier ? <span className="text-ink-600"> · {a.resourceIdentifier}</span> : null}
                    <p className="mt-0.5 truncate text-xs text-ink-500" title={a.userAgent ?? ""}>
                      <Mono>{a.tokenPrefix}…</Mono> {a.userAgent ? ` · ${a.userAgent.slice(0, 60)}` : ""}
                    </p>
                  </div>
                  <span className="whitespace-nowrap text-xs text-ink-500">{formatDate(a.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Realtor profile">
          {profile ? (
            <>
              <p className="mb-2 text-xs text-ink-500">Saved by the Chief of Staff · updated {formatDate(profile.updatedAt)}</p>
              <pre className="max-h-96 overflow-auto rounded-md bg-ink-50 p-3 font-mono text-xs text-ink-800">
                {JSON.stringify(profile.profileJson, null, 2)}
              </pre>
            </>
          ) : (
            <Empty>No profile saved yet. The Chief of Staff can save it during onboarding.</Empty>
          )}
        </Card>
      </div>
    </>
  );
}
