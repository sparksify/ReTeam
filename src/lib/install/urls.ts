import { normalizeBaseUrl } from "@/lib/base-url";

export type InstallResources = {
  manifest: string;
  company: string;
  standards: string;
  employees: string;
  profile: string;
  updates: string;
};

/** Public base URL: APP_URL when configured, otherwise derived from the request. */
export function getBaseUrl(request: Request): string {
  const configured = normalizeBaseUrl(process.env.APP_URL);
  if (configured) return configured;
  const url = new URL(request.url);
  const proto = request.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? url.host;
  return `${proto}://${host}`;
}

export function installUrl(baseUrl: string, token: string): string {
  return `${baseUrl}/install/${token}`;
}

export function resourceUrls(baseUrl: string, token: string): InstallResources {
  const root = `${baseUrl}/api/install/${token}`;
  return {
    manifest: root,
    company: `${root}/company`,
    standards: `${root}/standards`,
    employees: `${root}/employees`,
    profile: `${root}/profile`,
    updates: `${root}/updates`,
  };
}

export function employeeManualUrl(resources: InstallResources, slug: string): string {
  return `${resources.employees}/${slug}`;
}
