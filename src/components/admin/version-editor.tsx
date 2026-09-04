"use client";

import { useActionState } from "react";
import type { ActionState } from "@/app/admin/actions";
import { Button, FormMessage, Input, Label, Textarea } from "@/components/ui";

type Action = (prev: ActionState, formData: FormData) => Promise<ActionState>;

export function VersionEditor({
  hidden,
  initialContent,
  initialChangeNotes,
  saveAction,
  publishAction,
}: {
  hidden: Record<string, string>;
  initialContent: string;
  initialChangeNotes: string;
  saveAction: Action;
  publishAction: Action;
}) {
  const [saveState, save, saving] = useActionState<ActionState, FormData>(saveAction, {});
  const [publishState, publish, publishing] = useActionState<ActionState, FormData>(publishAction, {});
  const message = publishState.error ?? publishState.success ?? saveState.error ?? saveState.success;
  const tone = publishState.error || saveState.error ? "error" : "success";

  return (
    <form className="space-y-5">
      {Object.entries(hidden).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <div>
        <Label htmlFor="changeNotes" hint="what changed in this version">Change notes</Label>
        <Input id="changeNotes" name="changeNotes" defaultValue={initialChangeNotes} placeholder="e.g. Added objection-handling section" />
      </div>
      <div>
        <Label htmlFor="content" hint="Markdown — served verbatim to the Chief of Staff">Manual content</Label>
        <Textarea id="content" name="content" defaultValue={initialContent} rows={32} className="font-mono text-[13px] leading-relaxed" spellCheck={false} />
      </div>
      <FormMessage message={message} tone={tone} />
      <div className="flex flex-wrap gap-2">
        <Button type="submit" formAction={save} variant="secondary" disabled={saving || publishing}>
          {saving ? "Saving…" : "Save draft"}
        </Button>
        <Button type="submit" formAction={publish} variant="accent" disabled={saving || publishing}>
          {publishing ? "Publishing…" : "Save & publish"}
        </Button>
      </div>
      <p className="text-xs text-ink-500">Publishing makes this version live for every active installation immediately. The previous published version is kept in history as superseded.</p>
    </form>
  );
}
