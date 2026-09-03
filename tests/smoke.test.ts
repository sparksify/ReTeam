import { describe, expect, it } from "vitest";
import { createTestDb } from "./helpers/db";
import { seedFactoryContent } from "@/lib/seed";

describe("pglite smoke", () => {
  it("migrates and seeds", async () => {
    const { db, close } = await createTestDb();
    const report = await seedFactoryContent(db);
    expect(report.employeesCreated).toHaveLength(5);
    const again = await seedFactoryContent(db);
    expect(again.employeesCreated).toHaveLength(0);
    expect(again.manualsSeeded).toHaveLength(0);
    await close();
  });
});
