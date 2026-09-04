import Link from "next/link";
import { isAdminAuthenticated } from "@/lib/admin-session";
import { logoutAction } from "./actions";

const NAV = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/customers", label: "Customers & licenses" },
  { href: "/admin/employees", label: "Employees" },
  { href: "/admin/chief-of-staff", label: "Chief of Staff manual" },
  { href: "/admin/standards", label: "Global standards" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const authed = await isAdminAuthenticated().catch(() => false);
  if (!authed) return <>{children}</>;

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 shrink-0 border-r border-ink-200 bg-white lg:block">
        <div className="px-6 py-6">
          <Link href="/admin" className="text-sm font-semibold tracking-[0.2em] text-ink-950">
            RETEAM
          </Link>
          <p className="mt-1 text-xs text-ink-500">Owner admin</p>
        </div>
        <nav className="px-3">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-md px-3 py-2 text-sm text-ink-700 hover:bg-ink-100 hover:text-ink-950"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <form action={logoutAction} className="mt-8 px-6">
          <button type="submit" className="text-xs text-ink-500 hover:text-ink-900">
            Sign out
          </button>
        </form>
      </aside>
      <div className="min-w-0 flex-1">
        <div className="border-b border-ink-200 bg-white px-6 py-3 lg:hidden">
          <nav className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {NAV.map((item) => (
              <Link key={item.href} href={item.href} className="text-ink-700 hover:text-ink-950">
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <main className="mx-auto max-w-5xl px-6 py-10">{children}</main>
      </div>
    </div>
  );
}
