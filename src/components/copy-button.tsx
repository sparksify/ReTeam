"use client";

import { useState } from "react";

export function CopyButton({ text, label = "Copy", className = "" }: { text: string; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable (insecure context); the text is visible for manual copy.
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className={`inline-flex items-center gap-2 rounded-md bg-ink-950 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-ink-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-brass-500 ${className}`}
    >
      {copied ? "Copied" : label}
    </button>
  );
}
