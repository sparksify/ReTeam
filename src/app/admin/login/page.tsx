import { LoginForm } from "./login-form";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 py-24">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brass-600">ReTeam</p>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight text-ink-950">Owner admin</h1>
      <p className="mt-2 text-sm text-ink-600">Sign in with the admin password.</p>
      <div className="mt-8">
        <LoginForm next={next ?? "/admin"} />
      </div>
    </main>
  );
}
