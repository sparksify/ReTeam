export type { Customer, Employee, EmployeeManualVersion, License } from "@/db/schema";

/** Common shape of the Chief of Staff manual and Global Standards versions. */
export type DocumentLike = {
  version: number;
  content: string;
  changeNotes: string;
  publishedAt: Date | null;
};
