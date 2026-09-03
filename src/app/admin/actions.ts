"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/db/client";
import { ADMIN_COOKIE, createSessionValue, sessionCookieOptions, verifyPassword } from "@/lib/admin-auth";
import { requireAdmin } from "@/lib/admin-session";
import { adminPassword, appUrl, isProduction, sessionSecret } from "@/lib/env";
import { createCustomer, getCustomerByEmail, setCustomerStatus } from "@/lib/customers";
import {
  createDocumentDraft,
  getDocumentVersion,
  getPublishedDocument,
  publishDocumentVersion,
  updateDocumentDraft,
  type DocKind,
} from "@/lib/documents";
import {
  createManualDraft,
  getEmployeeById,
  getManualVersion,
  getPublishedManual,
  publishManualVersion,
  updateEmployeeMetadata,
  updateManualDraft,
} from "@/lib/employees";
import { issueLicense, revokeLicense, rotateLicense } from "@/lib/licenses";
import { installUrl } from "@/lib/install/urls";
import { bootstrapPrompt } from "@/lib/bootstrap-prompt";

export type ActionState = { error?: string; success?: string };
export type TokenState = ActionState & { url?: string; prompt?: string; tokenPrefix?: string };

const str = (v: FormDataEntryValue | null) => (typeof v === "string" ? v : "");

/* ------------------------------- auth ----------------------------------- */

export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const password = str(formData.get("password"));
  const next = str(formData.get("next"));
  let expected: string;
  try {
    expected = adminPassword();
    sessionSecret();
  } catch {
    return { error: "Admin login is not configured. Set ADMIN_PASSWORD and ADMIN_SESSION_SECRET." };
  }
  if (!password || !(await verifyPassword(password, expected))) {
    await new Promise((r) => setTimeout(r, 400));
    return { error: "Incorrect password." };
  }
  const store = await cookies();
  store.set(ADMIN_COOKIE, await createSessionValue(sessionSecret()), { ...sessionCookieOptions, secure: isProduction() });
  redirect(next.startsWith("/admin") ? next : "/admin");
}

export async function logoutAction(): Promise<void> {
  const store = await cookies();
  store.set(ADMIN_COOKIE, "", { ...sessionCookieOptions, maxAge: 0 });
  redirect("/admin/login");
}

/* ----------------------------- customers -------------------------------- */

const customerSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  email: z.string().trim().email("Enter a valid email").max(320),
  companyName: z.string().trim().max(200).optional(),
});

export async function createCustomerAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = customerSchema.safeParse({
    name: str(formData.get("name")),
    email: str(formData.get("email")),
    companyName: str(formData.get("companyName")),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const db = await getDb();
  if (await getCustomerByEmail(db, parsed.data.email)) return { error: "A customer with that email already exists." };
  const customer = await createCustomer(db, parsed.data);
  revalidatePath("/admin/customers");
  redirect(`/admin/customers/${customer.id}`);
}

export async function setCustomerStatusAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = str(formData.get("customerId"));
  const status = str(formData.get("status")) === "disabled" ? "disabled" : "active";
  await setCustomerStatus(await getDb(), id, status);
  revalidatePath(`/admin/customers/${id}`);
  revalidatePath("/admin/customers");
}

/* ------------------------------ licenses -------------------------------- */

function tokenResult(rawToken: string, tokenPrefix: string, success: string): TokenState {
  const url = installUrl(appUrl(), rawToken);
  return { success, url, prompt: bootstrapPrompt(url), tokenPrefix };
}

export async function issueLicenseAction(_prev: TokenState, formData: FormData): Promise<TokenState> {
  await requireAdmin();
  const customerId = str(formData.get("customerId"));
  const { license, rawToken } = await issueLicense(await getDb(), customerId);
  revalidatePath(`/admin/customers/${customerId}`);
  return tokenResult(rawToken, license.tokenPrefix, "New installation token issued. Copy it now — it will not be shown again.");
}

export async function rotateLicenseAction(_prev: TokenState, formData: FormData): Promise<TokenState> {
  await requireAdmin();
  const licenseId = str(formData.get("licenseId"));
  const customerId = str(formData.get("customerId"));
  const rotated = await rotateLicense(await getDb(), licenseId);
  if (!rotated) return { error: "License not found." };
  revalidatePath(`/admin/customers/${customerId}`);
  return tokenResult(rotated.rawToken, rotated.license.tokenPrefix, "Token rotated. The old link is revoked. Copy the new one now — it will not be shown again.");
}

export async function revokeLicenseAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const licenseId = str(formData.get("licenseId"));
  const customerId = str(formData.get("customerId"));
  await revokeLicense(await getDb(), licenseId);
  revalidatePath(`/admin/customers/${customerId}`);
}

/* ------------------------------ employees ------------------------------- */

const employeeSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  description: z.string().trim().max(2000),
  category: z.string().trim().min(1, "Category is required").max(100),
  status: z.enum(["active", "inactive"]),
  triggerExamples: z.array(z.string().trim().min(1)).max(20),
  inputSummary: z.string().trim().max(2000),
  outputSummary: z.string().trim().max(4000),
  sortOrder: z.coerce.number().int().min(0).max(10_000),
});

export async function updateEmployeeAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = str(formData.get("employeeId"));
  const parsed = employeeSchema.safeParse({
    name: str(formData.get("name")),
    description: str(formData.get("description")),
    category: str(formData.get("category")),
    status: str(formData.get("status")),
    triggerExamples: str(formData.get("triggerExamples")).split("\n").map((s) => s.trim()).filter(Boolean),
    inputSummary: str(formData.get("inputSummary")),
    outputSummary: str(formData.get("outputSummary")),
    sortOrder: str(formData.get("sortOrder")) || "100",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const updated = await updateEmployeeMetadata(await getDb(), id, parsed.data);
  if (!updated) return { error: "Employee not found." };
  revalidatePath(`/admin/employees/${id}`);
  revalidatePath("/admin/employees");
  return { success: "Employee metadata saved." };
}

export async function createManualDraftAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const employeeId = str(formData.get("employeeId"));
  const db = await getDb();
  const employee = await getEmployeeById(db, employeeId);
  if (!employee) throw new Error("Employee not found");
  const current = await getPublishedManual(db, employeeId);
  const draft = await createManualDraft(db, employeeId, {
    content: current?.content ?? `# ${employee.name} — Operating Manual\n\n`,
    changeNotes: "",
  });
  revalidatePath(`/admin/employees/${employeeId}`);
  redirect(`/admin/employees/${employeeId}/versions/${draft.id}`);
}

const versionSchema = z.object({
  content: z.string().min(1, "Content cannot be empty").max(500_000),
  changeNotes: z.string().trim().max(2000),
});

export async function saveManualDraftAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const versionId = str(formData.get("versionId"));
  const parsed = versionSchema.safeParse({ content: str(formData.get("content")), changeNotes: str(formData.get("changeNotes")) });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const db = await getDb();
  const updated = await updateManualDraft(db, versionId, parsed.data);
  if (!updated) return { error: "Only drafts can be edited." };
  revalidatePath(`/admin/employees/${updated.employeeId}/versions/${versionId}`);
  return { success: "Draft saved." };
}

export async function publishManualAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const versionId = str(formData.get("versionId"));
  const db = await getDb();
  const content = str(formData.get("content"));
  if (content) {
    const saved = await updateManualDraft(db, versionId, { content, changeNotes: str(formData.get("changeNotes")) });
    if (!saved) return { error: "Only drafts can be published." };
  }
  const published = await publishManualVersion(db, versionId);
  if (!published) return { error: "Only drafts can be published." };
  const version = await getManualVersion(db, versionId);
  revalidatePath(`/admin/employees/${version?.employeeId}`);
  revalidatePath(`/admin/employees/${version?.employeeId}/versions/${versionId}`);
  revalidatePath("/admin/employees");
  return { success: `Version ${published.version} is now live for all installations.` };
}

/* ------------------------------ documents ------------------------------- */

const DOC_PATHS: Record<DocKind, string> = { chief_of_staff: "/admin/chief-of-staff", standards: "/admin/standards" };

function parseKind(v: string): DocKind {
  if (v === "chief_of_staff" || v === "standards") return v;
  throw new Error("Unknown document kind");
}

export async function createDocumentDraftAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const kind = parseKind(str(formData.get("kind")));
  const db = await getDb();
  const current = await getPublishedDocument(db, kind);
  const draft = await createDocumentDraft(db, kind, { content: current?.content ?? "# \n", changeNotes: "" });
  revalidatePath(DOC_PATHS[kind]);
  redirect(`${DOC_PATHS[kind]}/versions/${draft.id}`);
}

export async function saveDocumentDraftAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const kind = parseKind(str(formData.get("kind")));
  const versionId = str(formData.get("versionId"));
  const parsed = versionSchema.safeParse({ content: str(formData.get("content")), changeNotes: str(formData.get("changeNotes")) });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const updated = await updateDocumentDraft(await getDb(), kind, versionId, parsed.data);
  if (!updated) return { error: "Only drafts can be edited." };
  revalidatePath(`${DOC_PATHS[kind]}/versions/${versionId}`);
  return { success: "Draft saved." };
}

export async function publishDocumentAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const kind = parseKind(str(formData.get("kind")));
  const versionId = str(formData.get("versionId"));
  const db = await getDb();
  const content = str(formData.get("content"));
  if (content) {
    const saved = await updateDocumentDraft(db, kind, versionId, { content, changeNotes: str(formData.get("changeNotes")) });
    if (!saved) return { error: "Only drafts can be published." };
  }
  const published = await publishDocumentVersion(db, kind, versionId);
  if (!published) return { error: "Only drafts can be published." };
  await getDocumentVersion(db, kind, versionId);
  revalidatePath(DOC_PATHS[kind]);
  revalidatePath(`${DOC_PATHS[kind]}/versions/${versionId}`);
  return { success: `Version ${published.version} is now live for all installations.` };
}
