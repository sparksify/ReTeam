import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6 py-24">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brass-600">ReTeam</p>
      <h1 className="mt-4 text-4xl font-semibold tracking-tight text-ink-950">
        The operating system for your AI real estate company.
      </h1>
      <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-600">
        ReTeam installs a pre-trained AI workforce into your AI Chief of Staff through a single private
        installation link. Customers receive their link after purchase.
      </p>
      <div className="mt-10">
        <Link
          href="/admin"
          className="inline-flex items-center rounded-md border border-ink-300 bg-white px-4 py-2 text-sm font-medium text-ink-800 shadow-sm hover:bg-ink-100"
        >
          Owner admin
        </Link>
      </div>
    </main>
  );
}
