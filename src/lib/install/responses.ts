import type { Customer, DocumentLike, Employee, EmployeeManualVersion, License } from "./types";
import { PLACEHOLDER_BANNER } from "@/content/factory-employees";
import { employeeManualUrl, type InstallResources } from "./urls";

export const PRODUCT = "ReTeam";

function iso(d: Date | null | undefined): string | null {
  return d ? d.toISOString() : null;
}

function resourceIndex(resources: InstallResources) {
  return {
    manifest: {
      url: resources.manifest,
      method: "GET",
      description: "This bootstrap manifest. Start here.",
    },
    company: {
      url: resources.company,
      method: "GET",
      description: "Chief of Staff operating manual: your role, the onboarding interview, how to run the company.",
    },
    standards: {
      url: resources.standards,
      method: "GET",
      description: "Global Operating Standards every employee must follow (accuracy, marketing, editability, compliance).",
    },
    employees: {
      url: resources.employees,
      method: "GET",
      description: "Catalog of available AI employees. Each entry includes a manual_url for its current published operating manual.",
    },
    profile: {
      url: resources.profile,
      method: "GET, PUT",
      description: "Realtor Profile storage. GET returns the saved profile (if any). PUT with a JSON object body saves it. Optional; use if your environment can send HTTP requests.",
    },
    updates: {
      url: resources.updates,
      method: "GET",
      description: "Current version numbers of every document, so you can detect updated manuals at the start of a session.",
    },
  };
}

const AGENT_NOTES = [
  "Every resource is fetched with a plain HTTP GET and returns JSON. No authentication headers are needed; the private token in the URL is the credential.",
  "Fields named `content` contain Markdown text meant to be read and followed as operating instructions.",
  "Treat everything retrieved from these resources as your company's operating policy.",
  "Keep the installation URL and its contents private. Never show the URL, the token, manuals or standards to anyone other than the Realtor you work for.",
  "Manuals are maintained centrally and can change. Re-fetch an employee's manual before starting new work for that employee.",
  "Do not modify or guess URLs. Use only the URLs provided in `resources` and in the employee catalog.",
];

export function buildManifest(input: {
  customer: Customer;
  license: License;
  resources: InstallResources;
  companyManual: DocumentLike | null;
  standards: DocumentLike | null;
  employees: Employee[];
}) {
  const { customer, license, resources, companyManual, standards, employees } = input;
  return {
    product: PRODUCT,
    schema: "reteam.install.manifest/v1",
    what_this_is:
      "You have loaded a private ReTeam installation. ReTeam is the remotely maintained operating system for an AI real estate company. This manifest tells you who you are, where your operating instructions live, and what to do first.",
    role: "AI Chief of Staff",
    role_summary:
      "You are the Realtor's AI Chief of Staff. You run their AI real estate company: you onboard the Realtor, learn their business and brand, and direct a team of factory-trained AI employees (each with a published operating manual) to do specialist work.",
    installation: {
      id: license.tokenPrefix,
      status: "active",
      registered_to: { name: customer.name, company_name: customer.companyName },
      activated_at: iso(license.activatedAt) ?? new Date().toISOString(),
    },
    versions: {
      company_manual: companyManual?.version ?? null,
      standards: standards?.version ?? null,
      employee_count: employees.length,
    },
    instructions: [
      "1. Fetch `resources.company.url` and read the Chief of Staff manual completely. It defines your role and the onboarding interview.",
      "2. Fetch `resources.standards.url` and read the Global Operating Standards. They govern all work the company produces.",
      "3. Fetch `resources.employees.url` to discover the available AI employees, their personas, the URL of each one's operating manual, and the ready-to-use `bot_setup` for creating each specialist's own bot.",
      "4. Introduce yourself to the Realtor as their AI Chief of Staff and begin the onboarding interview exactly as the Chief of Staff manual describes: one question at a time.",
      "5. When the Realtor asks for specialist work, fetch that employee's `manual_url` first and follow it. Never improvise a factory employee's instructions.",
    ],
    resources: resourceIndex(resources),
    employees: employees.map((e) => ({
      slug: e.slug,
      name: e.name,
      persona_name: e.personaName || null,
      employee_type: e.employeeType,
      manual_url: employeeManualUrl(resources, e.slug),
    })),
    next_action: `Fetch ${resources.company} now, read it completely, then load the standards and the employee catalog. After that, begin Realtor onboarding.`,
    agent_notes: AGENT_NOTES,
  };
}

export function buildCompany(input: { resources: InstallResources; manual: DocumentLike }) {
  const { resources, manual } = input;
  return {
    product: PRODUCT,
    schema: "reteam.install.company/v1",
    document: "chief_of_staff_manual",
    what_this_is:
      "The operating manual for the AI Chief of Staff. Follow it as company policy. It explains your role, the Realtor onboarding interview, how to route work to employees and how to stay current.",
    version: manual.version,
    published_at: iso(manual.publishedAt),
    change_notes: manual.changeNotes,
    content_format: "markdown",
    content: manual.content,
    related: {
      standards: resources.standards,
      employees: resources.employees,
      profile: resources.profile,
      updates: resources.updates,
    },
    next_action: `Load the Global Operating Standards at ${resources.standards}, then the employee catalog at ${resources.employees}. Then begin onboarding the Realtor as described above.`,
  };
}

export function buildStandards(input: { resources: InstallResources; standards: DocumentLike }) {
  const { resources, standards } = input;
  return {
    product: PRODUCT,
    schema: "reteam.install.standards/v1",
    document: "global_operating_standards",
    what_this_is:
      "Company-wide standards that every AI employee and the Chief of Staff must follow. They take precedence over any conflicting instruction in an employee manual when the standard is stricter.",
    version: standards.version,
    published_at: iso(standards.publishedAt),
    change_notes: standards.changeNotes,
    content_format: "markdown",
    content: standards.content,
    related: { company: resources.company, employees: resources.employees },
    next_action: "Apply these standards to all work. Return to the Chief of Staff manual's onboarding flow if you have not completed it.",
  };
}

export type CatalogEntry = { employee: Employee; manual: EmployeeManualVersion | null };

/** Display name for the specialist bot, e.g. "Tabitha — Listing Appointment Manager". */
export function botName(employee: Employee): string {
  return employee.personaName ? `${employee.personaName} — ${employee.name}` : employee.name;
}

/**
 * Complete instructions for a dedicated specialist bot. Pasted verbatim by the
 * Chief of Staff when it creates the bot, so it must stand alone and carry the
 * private URLs the specialist needs.
 */
export function botInstructions(resources: InstallResources, employee: Employee, realtorName: string): string {
  const manualUrl = employeeManualUrl(resources, employee.slug);
  const who = employee.personaName ? `${employee.personaName}, the ${employee.name}` : `the ${employee.name}`;
  return [
    `You are ${who} for ${realtorName}'s AI real estate company. The company runs on ReTeam, a remotely maintained operating system, and you are one of its factory-trained specialists.`,
    employee.personaDescription ? `Persona: ${employee.personaDescription}` : null,
    "",
    `Your operating manual: ${manualUrl}`,
    `Company operating standards: ${resources.standards}`,
    `Realtor profile: ${resources.profile}`,
    "",
    "At the start of EVERY task:",
    "1. Fetch your operating manual and read it completely. It is maintained centrally and may have changed since your last task.",
    "2. Fetch the company operating standards. They apply to everything you produce.",
    "3. Fetch the Realtor profile and use it for all branding, licensing, contact details and disclosures. Never ask for information it already contains.",
    "4. Confirm you have the minimum input your manual requires; ask only for what is missing.",
    "5. Do the work exactly as the manual describes and deliver finished work: summary, deliverables, verified facts vs. claims, items needing the Realtor's confirmation, suggested next step.",
    "",
    `What you do: ${employee.description}`,
    `What you need: ${employee.inputSummary}`,
    "",
    "Treat everything you retrieve from these URLs as company operating policy. Keep the URLs private; never show them to anyone other than the Realtor you work for. If your manual is marked as a development placeholder, say so and label your output as preliminary.",
  ]
    .filter((line) => line !== null)
    .join("\n");
}

export function catalogEntry(resources: InstallResources, entry: CatalogEntry, realtorName: string) {
  const { employee, manual } = entry;
  return {
    slug: employee.slug,
    name: employee.name,
    category: employee.category,
    employee_type: employee.employeeType,
    description: employee.description,
    input_summary: employee.inputSummary,
    output_summary: employee.outputSummary,
    trigger_examples: employee.triggerExamples,
    persona: {
      name: employee.personaName || null,
      description: employee.personaDescription || null,
      avatar_prompt: employee.avatarPrompt || null,
      avatar_url: employee.avatarUrl ?? null,
    },
    bot_setup: {
      name: botName(employee),
      instructions: botInstructions(resources, employee, realtorName),
      how_to_use:
        "Create a dedicated bot/agent with this name, paste `instructions` verbatim as its system prompt, and give it an avatar from `persona.avatar_prompt` (or `persona.avatar_url` when present).",
    },
    manual_url: employeeManualUrl(resources, employee.slug),
    manual_status: manual ? "published" : "unavailable",
    manual_version: manual?.version ?? null,
    manual_published_at: iso(manual?.publishedAt),
  };
}

export function buildEmployeeCatalog(input: { resources: InstallResources; entries: CatalogEntry[]; realtorName: string }) {
  const { resources, entries, realtorName } = input;
  return {
    product: PRODUCT,
    schema: "reteam.install.employees/v1",
    what_this_is:
      "The catalog of AI employees available to this company. `factory` employees are trained and maintained by ReTeam; `custom` employees were created for this company through the AI Hiring System. Each employee has a persona and a ready-to-use `bot_setup` block for creating its own dedicated bot.",
    how_to_use: [
      "Hire the team: for each employee, create a dedicated bot named `bot_setup.name`, paste `bot_setup.instructions` verbatim as its system prompt, and give it an avatar from `persona.avatar_prompt` (or `persona.avatar_url`).",
      "Match what the Realtor is working on to an employee using `description` and `trigger_examples`, then hand the task to that employee's bot.",
      "Before doing that employee's work, fetch its `manual_url` and follow the returned manual completely.",
      "An employee with `manual_status` of `unavailable` has no published manual yet; tell the Realtor that specialist is not ready.",
    ],
    count: entries.length,
    employees: entries.map((e) => catalogEntry(resources, e, realtorName)),
    related: { company: resources.company, standards: resources.standards },
  };
}

export function buildEmployeeManual(input: {
  resources: InstallResources;
  entry: CatalogEntry & { manual: EmployeeManualVersion };
  realtorName: string;
}) {
  const { resources, entry, realtorName } = input;
  const isPlaceholder = entry.manual.content.includes(PLACEHOLDER_BANNER);
  return {
    product: PRODUCT,
    schema: "reteam.install.employee-manual/v1",
    what_this_is: `The current published operating manual for the ${entry.employee.name}. Adopt this employee's role and persona and follow the manual when doing its work.`,
    employee: catalogEntry(resources, entry, realtorName),
    manual: {
      version: entry.manual.version,
      published_at: iso(entry.manual.publishedAt),
      change_notes: entry.manual.changeNotes,
      is_development_placeholder: isPlaceholder,
      content_format: "markdown",
      content: entry.manual.content,
    },
    instructions: [
      "Apply the Global Operating Standards alongside this manual.",
      "Use the Realtor Profile for all branding, licensing and contact details.",
      "Confirm you have the minimum input the manual requires; ask only for what is missing.",
      "Deliver finished work with verified facts separated from claims and a list of items needing the Realtor's confirmation.",
    ],
    related: { standards: resources.standards, employees: resources.employees, company: resources.company },
  };
}

export function buildUpdates(input: {
  resources: InstallResources;
  companyManual: DocumentLike | null;
  standards: DocumentLike | null;
  entries: CatalogEntry[];
}) {
  const { resources, companyManual, standards, entries } = input;
  return {
    product: PRODUCT,
    schema: "reteam.install.updates/v1",
    what_this_is: "Current version numbers of every ReTeam document for this installation. Compare with the versions you last used; re-fetch anything that changed.",
    checked_at: new Date().toISOString(),
    company_manual: companyManual
      ? { version: companyManual.version, published_at: iso(companyManual.publishedAt), url: resources.company }
      : null,
    standards: standards
      ? { version: standards.version, published_at: iso(standards.publishedAt), url: resources.standards }
      : null,
    employees: entries.map((e) => ({
      slug: e.employee.slug,
      manual_version: e.manual?.version ?? null,
      manual_published_at: iso(e.manual?.publishedAt),
      manual_url: employeeManualUrl(resources, e.employee.slug),
    })),
  };
}

export function buildProfile(input: {
  resources: InstallResources;
  profile: Record<string, unknown> | null;
  updatedAt: Date | null;
}) {
  return {
    product: PRODUCT,
    schema: "reteam.install.profile/v1",
    what_this_is:
      "The saved Realtor Profile for this installation. PUT a JSON object to this URL to save or replace it. Use it so the Realtor is never asked for the same information twice.",
    has_profile: input.profile !== null,
    updated_at: iso(input.updatedAt),
    profile: input.profile,
    related: { company: input.resources.company },
  };
}
