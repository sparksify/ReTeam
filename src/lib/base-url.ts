/**
 * Normalizes a configured public base URL: trims whitespace and trailing
 * slashes and adds "https://" when the scheme was omitted (a common mistake
 * when pasting a bare hostname into an environment variable).
 */
export function normalizeBaseUrl(raw: string | undefined | null): string | null {
  const trimmed = raw?.trim().replace(/\/+$/, "");
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const scheme = /^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(trimmed) ? "http" : "https";
  return `${scheme}://${trimmed}`;
}
