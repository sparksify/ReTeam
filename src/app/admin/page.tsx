import Link from "next/link";
import { count, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { customers, employees, licenses } from "@/db/schema";
import { getPublishedDocument } from "@/lib/documents";
import { Card, PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  const db = await getDb();
  const [[c], [l], [e], cos, std] = await Promise.all([
    db.select({ n: count() }).from(customers).where(eq(customers.status, "active")),
    db.select({ n: count() }).from(licenses).where(eq(licenses.status, "active")),
    db.select({ n: count() }).from(employees).where(eq(employees.employeeType, "factory")),
    getPublishedDocument(db, "chief_of_staff"),
    getPublishedDocument(db, "standards"),
  ]);

  const stats = [
    { label: "Active customers", value: c.n, href: "/admin/customers" },
    { label: "Active installation tokens", value: l.n, href: "/admin/customers" },
    { label: "Factory employees", value: e.n, href: "/admin/employees" },
    { label: "Chief of Staff manual", value: cos ? `v${cos.version}` : "unpublished", href: "/admin/chief-of-staff" },
    { label: "Global standards", value: std ? `v${std.version}` : "unpublished", href: "/admin/standards" },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Overview"
        title="Operating library"
        description="Everything an installed Chief of Staff retrieves is managed here. Publishing a new version makes it live for every active installation immediately."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="block">
            <Card className="h-full transition hover:border-ink-300">
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-500">{s.label}</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight text-ink-950">{s.value}</p>
            </Card>
          </Link>
        ))}
      </div>
      <Card className="mt-8" title="Acceptance test checklist">
        <ol className="list-decimal space-y-1.5 pl-5 text-sm text-ink-700">
          <li>Create a test customer under Customers.</li>
          <li>Generate an installation token and copy the private URL.</li>
          <li>Create a fresh Chief of Staff agent in GrokBot and give it only the bootstrap instruction.</li>
          <li>Watch the customer&apos;s access log: manifest → company → standards → employees → employee manual.</li>
        </ol>
      </Card>
    </>
  );
}
