import { Badge, formatDate } from "@/components/ui";

export function VersionView({ version, status, changeNotes, publishedAt, content }: { version: number; status: string; changeNotes: string; publishedAt: Date | null; content: string }) {
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3 text-sm text-ink-600">
        <Badge>{status}</Badge>
        <span>v{version}</span>
        {publishedAt ? <span>· published {formatDate(publishedAt)}</span> : null}
        {changeNotes ? <span>· {changeNotes}</span> : null}
      </div>
      <pre className="max-h-[70vh] overflow-auto whitespace-pre-wrap rounded-md border border-ink-200 bg-ink-50 p-4 font-mono text-[13px] leading-relaxed text-ink-800">{content}</pre>
    </div>
  );
}
