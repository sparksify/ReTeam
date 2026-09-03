/**
 * Versioned company-wide documents: the Chief of Staff manual and the Global
 * Operating Standards. Both tables share an identical shape, so one set of
 * functions serves both via `DocKind`.
 */
import { and, desc, eq, max } from "drizzle-orm";
import type { Db } from "@/db/client";
import {
  chiefOfStaffManualVersions,
  globalStandardVersions,
  type ChiefOfStaffManualVersion,
} from "@/db/schema";

export type DocKind = "chief_of_staff" | "standards";
export type DocumentVersion = ChiefOfStaffManualVersion;
type DocTable = typeof chiefOfStaffManualVersions;

const TABLES: Record<DocKind, DocTable> = {
  chief_of_staff: chiefOfStaffManualVersions,
  standards: globalStandardVersions as unknown as DocTable,
};

export const DOC_LABELS: Record<DocKind, string> = {
  chief_of_staff: "Chief of Staff Manual",
  standards: "Global Operating Standards",
};

export async function getPublishedDocument(db: Db, kind: DocKind): Promise<DocumentVersion | null> {
  const t = TABLES[kind];
  const [row] = await db
    .select()
    .from(t)
    .where(eq(t.status, "published"))
    .orderBy(desc(t.version))
    .limit(1);
  return row ?? null;
}

export async function listDocumentVersions(db: Db, kind: DocKind): Promise<DocumentVersion[]> {
  const t = TABLES[kind];
  return db.select().from(t).orderBy(desc(t.version));
}

export async function getDocumentVersion(db: Db, kind: DocKind, id: string): Promise<DocumentVersion | null> {
  const t = TABLES[kind];
  const [row] = await db.select().from(t).where(eq(t.id, id)).limit(1);
  return row ?? null;
}

export async function createDocumentDraft(
  db: Db,
  kind: DocKind,
  input: { content: string; changeNotes?: string },
): Promise<DocumentVersion> {
  const t = TABLES[kind];
  const [{ latest }] = await db.select({ latest: max(t.version) }).from(t);
  const [row] = await db
    .insert(t)
    .values({ version: (latest ?? 0) + 1, content: input.content, changeNotes: input.changeNotes ?? "" })
    .returning();
  return row;
}

export async function updateDocumentDraft(
  db: Db,
  kind: DocKind,
  id: string,
  input: { content: string; changeNotes?: string },
): Promise<DocumentVersion | null> {
  const t = TABLES[kind];
  const [row] = await db
    .update(t)
    .set({ content: input.content, changeNotes: input.changeNotes ?? "" })
    .where(and(eq(t.id, id), eq(t.status, "draft")))
    .returning();
  return row ?? null;
}

/** Publishes a draft; the previously published version becomes `superseded` (never deleted). */
export async function publishDocumentVersion(db: Db, kind: DocKind, id: string): Promise<DocumentVersion | null> {
  const t = TABLES[kind];
  const [target] = await db.select().from(t).where(eq(t.id, id)).limit(1);
  if (!target || target.status !== "draft") return null;
  await db.update(t).set({ status: "superseded" }).where(eq(t.status, "published"));
  const [row] = await db
    .update(t)
    .set({ status: "published", publishedAt: new Date() })
    .where(eq(t.id, id))
    .returning();
  return row ?? null;
}
