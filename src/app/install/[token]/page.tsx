import { headers } from "next/headers";
import { getDb } from "@/db/client";
import { recordAccess } from "@/lib/access";
import { bootstrapPrompt } from "@/lib/bootstrap-prompt";
import { resolveInstallToken } from "@/lib/licenses";
import { installUrl, resourceUrls } from "@/lib/install/urls";
import { CopyButton } from "@/components/copy-button";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ token: string }> };

function baseUrlFromHeaders(h: Headers): string {
  const configured = process.env.APP_URL?.replace(/\/+$/, "");
  if (configured) return configured;
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}

export default async function InstallPage({ params }: Props) {
  const { token } = await params;
  const db = getDb();
  const resolved = await resolveInstallToken(db, token);

  if (!resolved) {
    return (
      <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6 py-24">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brass-600">ReTeam</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-ink-950">This installation link is not valid.</h1>
        <p className="mt-4 leading-relaxed text-ink-600">
          The link may have been mistyped, replaced, or revoked. Please open your ReTeam account or contact ReTeam
          support to receive a current installation link.
        </p>
      </main>
    );
  }

  const h = await headers();
  await recordAccess(db, {
    licenseId: resolved.license.id,
    resourceType: "install_page",
    ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    userAgent: h.get("user-agent"),
  });

  const baseUrl = baseUrlFromHeaders(h);
  const url = installUrl(baseUrl, token);
  const resources = resourceUrls(baseUrl, token);
  const prompt = bootstrapPrompt(url);

  return (
    <main className="mx-auto max-w-2xl px-6 py-20">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brass-600">ReTeam</p>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight text-ink-950 sm:text-4xl">
        Your ReTeam AI Real Estate Company is ready to install.
      </h1>
      <p className="mt-4 text-lg leading-relaxed text-ink-600">
        Registered to <span className="font-medium text-ink-900">{resolved.customer.name}</span>
        {resolved.customer.companyName ? <> · {resolved.customer.companyName}</> : null}
      </p>

      <ol className="mt-10 space-y-6 text-ink-700">
        <li className="flex gap-4">
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink-950 text-xs font-semibold text-white">1</span>
          <div>
            <p className="font-medium text-ink-900">Create an AI Chief of Staff</p>
            <p className="mt-1 text-sm leading-relaxed">
              In Grok, GrokBot or another AI agent environment that can browse the web, create a new agent and name it
              your Chief of Staff.
            </p>
          </div>
        </li>
        <li className="flex gap-4">
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink-950 text-xs font-semibold text-white">2</span>
          <div>
            <p className="font-medium text-ink-900">Give it this instruction</p>
            <p className="mt-1 text-sm leading-relaxed">Copy the text below and send it as your first message.</p>
          </div>
        </li>
      </ol>

      <div className="mt-8 rounded-lg border border-ink-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-ink-100 px-5 py-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-ink-500">Bootstrap instruction</span>
          <CopyButton text={prompt} label="Copy instruction" />
        </div>
        <pre className="overflow-x-auto whitespace-pre-wrap px-5 py-5 font-sans text-[15px] leading-relaxed text-ink-900">{prompt}</pre>
      </div>

      <p className="mt-6 text-sm leading-relaxed text-ink-500">
        This link is private to you. Anyone with it can load your company&apos;s operating instructions, so share it
        only with your own AI Chief of Staff. If it is ever exposed, ReTeam can reissue it.
      </p>

      <section className="mt-16 border-t border-ink-200 pt-8">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-500">If you are an AI agent reading this page</h2>
        <p className="mt-3 text-sm leading-relaxed text-ink-700">
          You are the AI Chief of Staff for this company. Your machine-readable operating instructions are served as
          JSON. Fetch the installation manifest with an HTTP GET request to:
        </p>
        <pre className="mt-3 overflow-x-auto rounded-md bg-ink-100 px-4 py-3 font-mono text-xs text-ink-800">{resources.manifest}</pre>
        <p className="mt-3 text-sm leading-relaxed text-ink-700">
          The manifest lists every resource (company manual, standards, employee catalog) and the next action to take.
          Read it completely and follow it.
        </p>
      </section>
    </main>
  );
}
