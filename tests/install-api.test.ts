import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Db } from "@/db/client";
import { listRecentAccess } from "@/lib/access";
import { createCustomer, setCustomerStatus } from "@/lib/customers";
import { createManualDraft, getFactoryEmployeeBySlug } from "@/lib/employees";
import { NOT_FOUND_BODY } from "@/lib/install/guard";
import { issueLicense, revokeLicense } from "@/lib/licenses";
import { resetRateLimits } from "@/lib/rate-limit";
import { generateInstallToken } from "@/lib/tokens";
import { GET as manifest } from "@/app/api/install/[token]/route";
import { GET as company } from "@/app/api/install/[token]/company/route";
import { GET as standards } from "@/app/api/install/[token]/standards/route";
import { GET as employees } from "@/app/api/install/[token]/employees/route";
import { GET as employeeManual } from "@/app/api/install/[token]/employees/[slug]/route";
import { GET as profileGet, PUT as profilePut } from "@/app/api/install/[token]/profile/route";
import { GET as updates } from "@/app/api/install/[token]/updates/route";
import { bootTestApp, params, req, TEST_BASE_URL } from "./helpers/setup";

let db: Db;
let close: () => Promise<void>;
let token: string;
let licenseId: string;
let customerId: string;

const base = (t: string) => `${TEST_BASE_URL}/api/install/${t}`;

beforeAll(async () => {
  ({ db, close } = await bootTestApp());
  const customer = await createCustomer(db, { email: "realtor@example.com", name: "Jordan Realtor", companyName: "Jordan Homes" });
  customerId = customer.id;
  const issued = await issueLicense(db, customer.id);
  token = issued.rawToken;
  licenseId = issued.license.id;
});
afterAll(() => close());
beforeEach(() => resetRateLimits());

describe("installation manifest", () => {
  it("returns a self-describing bootstrap package for a valid token", async () => {
    const res = await manifest(req(base(token)), params({ token }));
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    const body = await res.json();
    expect(body.product).toBe("ReTeam");
    expect(body.role).toBe("AI Chief of Staff");
    expect(body.what_this_is).toMatch(/private ReTeam installation/);
    expect(body.resources.company.url).toBe(`${base(token)}/company`);
    expect(body.resources.standards.url).toBe(`${base(token)}/standards`);
    expect(body.resources.employees.url).toBe(`${base(token)}/employees`);
    expect(body.instructions).toHaveLength(5);
    expect(body.next_action).toContain(`${base(token)}/company`);
    expect(body.versions).toEqual({ company_manual: 1, standards: 1, employee_count: 5 });
    expect(body.installation.registered_to.name).toBe("Jordan Realtor");
    expect(body.employees.map((e: { slug: string }) => e.slug)).toContain("listing-appointment-manager");
    // Raw token never appears outside the URLs themselves and the body never includes hashes.
    expect(JSON.stringify(body)).not.toMatch(/[0-9a-f]{64}/);
  });

  it("marks the license activated and records access", async () => {
    await manifest(req(base(token)), params({ token }));
    const logs = await listRecentAccess(db, licenseId);
    expect(logs.length).toBeGreaterThan(0);
    expect(logs[0].resourceType).toBe("manifest");
    expect(logs[0].ipHash).toMatch(/^[0-9a-f]{32}$/);
    expect(logs[0].ipHash).not.toContain("203.0.113");
    expect(logs[0].userAgent).toBe("vitest");
  });

  it("returns the identical not-found body for unknown, malformed and revoked tokens", async () => {
    const unknown = await manifest(req(base(generateInstallToken())), params({ token: generateInstallToken() }));
    expect(unknown.status).toBe(404);
    expect(await unknown.json()).toEqual(NOT_FOUND_BODY);

    const malformed = await manifest(req(base("garbage")), params({ token: "garbage" }));
    expect(malformed.status).toBe(404);
    expect(await malformed.json()).toEqual(NOT_FOUND_BODY);

    const other = await createCustomer(db, { email: "revoked@example.com", name: "Revoked" });
    const issued = await issueLicense(db, other.id);
    await revokeLicense(db, issued.license.id);
    const revoked = await manifest(req(base(issued.rawToken)), params({ token: issued.rawToken }));
    expect(revoked.status).toBe(404);
    expect(await revoked.json()).toEqual(NOT_FOUND_BODY);
    expect(JSON.stringify(await manifest(req(base(issued.rawToken)), params({ token: issued.rawToken })).then((r) => r.json()))).not.toContain("Revoked");
  });

  it("blocks disabled customers", async () => {
    const c = await createCustomer(db, { email: "disabled@example.com", name: "Disabled" });
    const issued = await issueLicense(db, c.id);
    await setCustomerStatus(db, c.id, "disabled");
    const res = await employeeManual(
      req(`${base(issued.rawToken)}/employees/listing-appointment-manager`),
      params({ token: issued.rawToken, slug: "listing-appointment-manager" }),
    );
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual(NOT_FOUND_BODY);
  });
});

describe("company, standards, updates", () => {
  it("serves the published Chief of Staff manual", async () => {
    const res = await company(req(`${base(token)}/company`), params({ token }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.document).toBe("chief_of_staff_manual");
    expect(body.version).toBe(1);
    expect(body.content_format).toBe("markdown");
    expect(body.content).toContain("one question at a time");
    expect(body.content).toContain("Your company is ready");
    expect(body.related.employees).toBe(`${base(token)}/employees`);
  });

  it("serves the published global standards", async () => {
    const res = await standards(req(`${base(token)}/standards`), params({ token }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.document).toBe("global_operating_standards");
    expect(body.version).toBe(1);
    expect(body.content).toContain("Never invent property facts");
    expect(body.content).toContain("Preserve brokerage disclosures");
  });

  it("reports current versions in updates", async () => {
    const res = await updates(req(`${base(token)}/updates`), params({ token }));
    const body = await res.json();
    expect(body.company_manual.version).toBe(1);
    expect(body.standards.version).toBe(1);
    expect(body.employees).toHaveLength(5);
  });
});

describe("employee catalog and manuals", () => {
  it("lists the five factory employees with manual URLs", async () => {
    const res = await employees(req(`${base(token)}/employees`), params({ token }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.count).toBe(5);
    const slugs = body.employees.map((e: { slug: string }) => e.slug);
    expect(slugs).toEqual([
      "listing-appointment-manager",
      "listing-launch-manager",
      "property-website-builder",
      "open-house-manager",
      "real-estate-content-manager",
    ]);
    const first = body.employees[0];
    expect(first.employee_type).toBe("factory");
    expect(first.manual_url).toBe(`${base(token)}/employees/listing-appointment-manager`);
    expect(first.manual_status).toBe("published");
    expect(first.trigger_examples.length).toBeGreaterThan(0);
  });

  it("serves the current published manual for an employee", async () => {
    const res = await employeeManual(
      req(`${base(token)}/employees/listing-appointment-manager`),
      params({ token, slug: "listing-appointment-manager" }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.employee.name).toBe("Listing Appointment Manager");
    expect(body.manual.version).toBe(1);
    expect(body.manual.is_development_placeholder).toBe(true);
    expect(body.manual.content).toContain("DEVELOPMENT PLACEHOLDER");
    expect(body.related.standards).toBe(`${base(token)}/standards`);
  });

  it("never exposes a draft manual", async () => {
    const employee = (await getFactoryEmployeeBySlug(db, "listing-launch-manager"))!;
    await createManualDraft(db, employee.id, { content: "SECRET DRAFT v2" });
    const res = await employeeManual(
      req(`${base(token)}/employees/listing-launch-manager`),
      params({ token, slug: "listing-launch-manager" }),
    );
    const body = await res.json();
    expect(body.manual.version).toBe(1);
    expect(body.manual.content).not.toContain("SECRET DRAFT");

    const catalog = await (await employees(req(`${base(token)}/employees`), params({ token }))).json();
    const entry = catalog.employees.find((e: { slug: string }) => e.slug === "listing-launch-manager");
    expect(entry.manual_version).toBe(1);
  });

  it("returns a helpful 404 for unknown employees", async () => {
    const res = await employeeManual(req(`${base(token)}/employees/nope`), params({ token, slug: "nope" }));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("employee_not_found");
    expect(body.employees_url).toBe(`${base(token)}/employees`);
  });

  it("refuses manuals for invalid tokens", async () => {
    const bad = generateInstallToken();
    const res = await employeeManual(req(`${base(bad)}/employees/listing-appointment-manager`), params({ token: bad, slug: "listing-appointment-manager" }));
    expect(res.status).toBe(404);
    expect(JSON.stringify(await res.json())).not.toContain("PLACEHOLDER");
  });
});

describe("profile", () => {
  it("round-trips a Realtor profile", async () => {
    const empty = await (await profileGet(req(`${base(token)}/profile`), params({ token }))).json();
    expect(empty.has_profile).toBe(false);

    const put = await profilePut(
      req(`${base(token)}/profile`, { method: "PUT", body: JSON.stringify({ name: "Jordan", license_number: "12345" }) }),
      params({ token }),
    );
    expect(put.status).toBe(200);
    expect((await put.json()).saved).toBe(true);

    const got = await (await profileGet(req(`${base(token)}/profile`), params({ token }))).json();
    expect(got.profile).toEqual({ name: "Jordan", license_number: "12345" });

    const bad = await profilePut(req(`${base(token)}/profile`, { method: "PUT", body: "[1,2]" }), params({ token }));
    expect(bad.status).toBe(400);
    const notJson = await profilePut(req(`${base(token)}/profile`, { method: "PUT", body: "{" }), params({ token }));
    expect(notJson.status).toBe(400);
  });
});

describe("rate limiting", () => {
  it("locks out an IP after repeated failed lookups", async () => {
    const ip = "198.51.100.7";
    for (let i = 0; i < 20; i++) {
      const bad = generateInstallToken();
      const res = await manifest(req(base(bad), { ip }), params({ token: bad }));
      expect(res.status).toBe(404);
    }
    const blocked = await manifest(req(base(token), { ip }), params({ token }));
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("retry-after")).toBeTruthy();
    // Other IPs are unaffected.
    const ok = await manifest(req(base(token), { ip: "198.51.100.8" }), params({ token }));
    expect(ok.status).toBe(200);
  });

  it("caps overall request volume per IP", async () => {
    const ip = "198.51.100.9";
    let last = 200;
    for (let i = 0; i < 121; i++) {
      last = (await standards(req(`${base(token)}/standards`, { ip }), params({ token }))).status;
    }
    expect(last).toBe(429);
  });
});

describe("customer scoping", () => {
  it("only shows custom employees to their owner", async () => {
    const { employees: employeesTable } = await import("@/db/schema");
    await db.insert(employeesTable).values({
      slug: "morning-brief-manager",
      name: "Morning Brief Manager",
      employeeType: "custom",
      ownerCustomerId: customerId,
      description: "Custom",
    });
    const mine = await (await employees(req(`${base(token)}/employees`), params({ token }))).json();
    expect(mine.employees.map((e: { slug: string }) => e.slug)).toContain("morning-brief-manager");
    expect(mine.employees.find((e: { slug: string }) => e.slug === "morning-brief-manager").employee_type).toBe("custom");

    const other = await createCustomer(db, { email: "other@example.com", name: "Other" });
    const issued = await issueLicense(db, other.id);
    const theirs = await (await employees(req(`${base(issued.rawToken)}/employees`), params({ token: issued.rawToken }))).json();
    expect(theirs.count).toBe(5);
  });
});
