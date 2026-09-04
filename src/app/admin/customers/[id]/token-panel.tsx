"use client";

import { useActionState } from "react";
import { tokenAction, type TokenState } from "../../actions";
import { CopyButton } from "@/components/copy-button";
import { Button, Card, FormMessage, Mono } from "@/components/ui";

type ActiveLicense = { id: string; tokenPrefix: string };

function TokenReveal({ state }: { state: TokenState }) {
  if (!state.url) return <FormMessage message={state.error} />;
  return (
    <div className="rounded-md border border-brass-500/40 bg-brass-50 p-4">
      <p className="text-sm font-medium text-brass-700">{state.success}</p>
      <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-ink-500">Private installation URL</p>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <code className="break-all rounded bg-white px-2 py-1 font-mono text-xs text-ink-900">{state.url}</code>
        <CopyButton text={state.url} label="Copy URL" className="px-2.5 py-1 text-xs" />
      </div>
      <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-ink-500">Bootstrap instruction for the Chief of Staff</p>
      <div className="mt-1 flex flex-col gap-2">
        <pre className="whitespace-pre-wrap rounded bg-white px-3 py-2 text-xs leading-relaxed text-ink-900">{state.prompt}</pre>
        <div>
          <CopyButton text={state.prompt ?? ""} label="Copy bootstrap instruction" className="px-2.5 py-1 text-xs" />
        </div>
      </div>
      <p className="mt-3 text-xs text-ink-500">
        Token <Mono>{state.tokenPrefix}…</Mono>. Only a hash is stored; leaving this page loses the full URL.
      </p>
    </div>
  );
}

export function TokenPanel({ customerId, activeLicenses }: { customerId: string; activeLicenses: ActiveLicense[] }) {
  const [state, action, pending] = useActionState<TokenState, FormData>(tokenAction, {});
  return (
    <Card
      title="Installation token"
      actions={
        <form action={action}>
          <input type="hidden" name="customerId" value={customerId} />
          <input type="hidden" name="intent" value="issue" />
          <Button type="submit" variant="accent" disabled={pending}>
            {pending ? "Working…" : "Generate installation token"}
          </Button>
        </form>
      }
    >
      <div className="space-y-4">
        {state.url || state.error ? (
          <TokenReveal state={state} />
        ) : (
          <p className="text-sm text-ink-600">
            Generates a cryptographically random private URL for this customer. The raw token is shown once and never stored.
          </p>
        )}
        {activeLicenses.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2 border-t border-ink-100 pt-4">
            <span className="text-sm text-ink-600">Rotate (revoke and reissue):</span>
            {activeLicenses.map((l) => (
              <form key={l.id} action={action}>
                <input type="hidden" name="customerId" value={customerId} />
                <input type="hidden" name="intent" value="rotate" />
                <input type="hidden" name="licenseId" value={l.id} />
                <Button type="submit" variant="secondary" className="px-2.5 py-1 text-xs" disabled={pending}>
                  Rotate <Mono>{l.tokenPrefix}…</Mono>
                </Button>
              </form>
            ))}
          </div>
        ) : null}
      </div>
    </Card>
  );
}
