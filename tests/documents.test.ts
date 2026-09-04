import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/db/client";
import {
  createDocumentDraft,
  getPublishedDocument,
  listDocumentVersions,
  publishDocumentVersion,
  updateDocumentDraft,
} from "@/lib/documents";
import {
  createManualDraft,
  getFactoryEmployeeBySlug,
  getPublishedManual,
  listManualVersions,
  publishManualVersion,
} from "@/lib/employees";
import { bootTestApp } from "./helpers/setup";

let db: Db;
let close: () => Promise<void>;

beforeAll(async () => {
  ({ db, close } = await bootTestApp());
});
afterAll(() => close());

describe("versioned documents", () => {
  it("seeds a published v1 of the Chief of Staff manual and standards", async () => {
    const cos = await getPublishedDocument(db, "chief_of_staff");
    const std = await getPublishedDocument(db, "standards");
    expect(cos?.version).toBe(1);
    expect(cos?.content).toContain("one question at a time");
    expect(std?.version).toBe(1);
    expect(std?.content).toContain("Never invent property facts");
  });

  it("drafts are not the published version until published; publishing supersedes the old one", async () => {
    const draft = await createDocumentDraft(db, "standards", { content: "v2 standards", changeNotes: "tighten" });
    expect(draft.version).toBe(2);
    expect(draft.status).toBe("draft");
    expect((await getPublishedDocument(db, "standards"))?.version).toBe(1);

    const edited = await updateDocumentDraft(db, "standards", draft.id, { content: "v2 standards edited" });
    expect(edited?.content).toBe("v2 standards edited");

    const published = await publishDocumentVersion(db, "standards", draft.id);
    expect(published?.status).toBe("published");
    expect(published?.publishedAt).toBeInstanceOf(Date);
    expect((await getPublishedDocument(db, "standards"))?.version).toBe(2);

    const versions = await listDocumentVersions(db, "standards");
    expect(versions.map((v) => [v.version, v.status])).toEqual([
      [2, "published"],
      [1, "superseded"],
    ]);
    // Old content is preserved.
    expect(versions[1].content).toContain("Never invent property facts");
    // A superseded version cannot be edited.
    expect(await updateDocumentDraft(db, "standards", versions[1].id, { content: "x" })).toBeNull();
    // Publishing an already-published version is a no-op.
    expect(await publishDocumentVersion(db, "standards", draft.id)).toBeNull();
  });
});

describe("employee manuals", () => {
  it("selects the current published version, never a draft", async () => {
    const employee = (await getFactoryEmployeeBySlug(db, "open-house-manager"))!;
    expect((await getPublishedManual(db, employee.id))?.version).toBe(1);

    const draft = await createManualDraft(db, employee.id, { content: "v2 draft", changeNotes: "wip" });
    expect(draft.version).toBe(2);
    expect((await getPublishedManual(db, employee.id))?.version).toBe(1);

    await publishManualVersion(db, draft.id);
    const current = await getPublishedManual(db, employee.id);
    expect(current?.version).toBe(2);
    expect(current?.content).toBe("v2 draft");

    const refreshed = await getFactoryEmployeeBySlug(db, "open-house-manager");
    expect(refreshed?.currentVersion).toBe(2);

    const history = await listManualVersions(db, employee.id);
    expect(history.map((v) => [v.version, v.status])).toEqual([
      [2, "published"],
      [1, "superseded"],
    ]);
  });
});
