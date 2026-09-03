import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

export function PageHeader({ title, description, actions, eyebrow }: { title: string; description?: ReactNode; actions?: ReactNode; eyebrow?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow ? <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-brass-600">{eyebrow}</p> : null}
        <h1 className="text-2xl font-semibold tracking-tight text-ink-950">{title}</h1>
        {description ? <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-600">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function Card({ children, className = "", title, actions }: { children: ReactNode; className?: string; title?: string; actions?: ReactNode }) {
  return (
    <section className={`rounded-lg border border-ink-200 bg-white shadow-sm ${className}`}>
      {title ? (
        <header className="flex items-center justify-between border-b border-ink-100 px-5 py-3">
          <h2 className="text-sm font-semibold text-ink-900">{title}</h2>
          {actions}
        </header>
      ) : null}
      <div className="px-5 py-5">{children}</div>
    </section>
  );
}

const buttonBase =
  "inline-flex items-center justify-center gap-2 rounded-md px-3.5 py-2 text-sm font-medium shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brass-500 disabled:cursor-not-allowed disabled:opacity-50";
const buttonVariants = {
  primary: "bg-ink-950 text-white hover:bg-ink-800",
  secondary: "border border-ink-300 bg-white text-ink-800 hover:bg-ink-100",
  danger: "border border-clay-700/30 bg-white text-clay-700 hover:bg-clay-100",
  accent: "bg-brass-600 text-white hover:bg-brass-700",
} as const;

export type ButtonVariant = keyof typeof buttonVariants;

export function Button({ variant = "primary", className = "", ...props }: ComponentProps<"button"> & { variant?: ButtonVariant }) {
  return <button className={`${buttonBase} ${buttonVariants[variant]} ${className}`} {...props} />;
}

export function LinkButton({ variant = "secondary", className = "", ...props }: ComponentProps<typeof Link> & { variant?: ButtonVariant }) {
  return <Link className={`${buttonBase} ${buttonVariants[variant]} ${className}`} {...props} />;
}

const badgeTones: Record<string, string> = {
  active: "bg-moss-100 text-moss-700",
  published: "bg-moss-100 text-moss-700",
  draft: "bg-brass-100 text-brass-700",
  superseded: "bg-ink-100 text-ink-600",
  revoked: "bg-clay-100 text-clay-700",
  disabled: "bg-clay-100 text-clay-700",
  inactive: "bg-ink-100 text-ink-600",
  factory: "bg-slate-700/10 text-slate-700",
  custom: "bg-brass-100 text-brass-700",
};

export function Badge({ children, tone }: { children: ReactNode; tone?: string }) {
  const cls = badgeTones[tone ?? String(children)] ?? "bg-ink-100 text-ink-700";
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>{children}</span>;
}

export function Label({ children, htmlFor, hint }: { children: ReactNode; htmlFor?: string; hint?: string }) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-ink-800">
      {children}
      {hint ? <span className="ml-2 font-normal text-ink-500">{hint}</span> : null}
    </label>
  );
}

const fieldBase =
  "mt-1.5 block w-full rounded-md border border-ink-300 bg-white px-3 py-2 text-sm text-ink-900 shadow-sm placeholder:text-ink-400 focus:border-brass-500 focus:outline-none focus:ring-2 focus:ring-brass-500/30";

export function Input({ className = "", ...props }: ComponentProps<"input">) {
  return <input className={`${fieldBase} ${className}`} {...props} />;
}

export function Textarea({ className = "", ...props }: ComponentProps<"textarea">) {
  return <textarea className={`${fieldBase} ${className}`} {...props} />;
}

export function Select({ className = "", ...props }: ComponentProps<"select">) {
  return <select className={`${fieldBase} ${className}`} {...props} />;
}

export function Field({ children }: { children: ReactNode }) {
  return <div className="space-y-0">{children}</div>;
}

export function FormMessage({ message, tone = "error" }: { message?: string | null; tone?: "error" | "success" }) {
  if (!message) return null;
  const cls = tone === "error" ? "border-clay-700/30 bg-clay-100 text-clay-700" : "border-moss-700/30 bg-moss-100 text-moss-700";
  return <p className={`rounded-md border px-3 py-2 text-sm ${cls}`}>{message}</p>;
}

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">{children}</table>
    </div>
  );
}

export function Th({ children, className = "" }: { children?: ReactNode; className?: string }) {
  return <th className={`border-b border-ink-200 pb-2 pr-4 text-xs font-semibold uppercase tracking-wider text-ink-500 ${className}`}>{children}</th>;
}

export function Td({ children, className = "" }: { children?: ReactNode; className?: string }) {
  return <td className={`border-b border-ink-100 py-3 pr-4 align-top text-ink-800 ${className}`}>{children}</td>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-md border border-dashed border-ink-300 px-4 py-6 text-center text-sm text-ink-500">{children}</p>;
}

export function Mono({ children }: { children: ReactNode }) {
  return <code className="rounded bg-ink-100 px-1.5 py-0.5 font-mono text-xs text-ink-800">{children}</code>;
}

export function formatDate(d: Date | null | undefined): string {
  if (!d) return "—";
  return d.toLocaleString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}
