import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { canRestoreArchivedPet, deceasedDay, optionalDeceasedDay } from "./status.ts";

describe("deceased day", () => {
    it("keeps today and an earlier day", () => {
        assert.ok(deceasedDay("2026-11-27", "2026-11-27"));
        assert.ok(deceasedDay("2026-01-02", "2026-11-27"));
    });

    it("restores an archived pet and leaves active and deceased pets", () => {
        assert.equal(canRestoreArchivedPet({ status: "ARCHIVED" }), true);
        assert.equal(canRestoreArchivedPet({ status: "ACTIVE" }), false);
        assert.equal(canRestoreArchivedPet({ status: "DECEASED" }), false);
    });

    it("keeps an unknown death date empty and refuses a future day", () => {
        assert.deepEqual(optionalDeceasedDay("", "2026-11-27"), { ok: true, date: null });
        assert.deepEqual(optionalDeceasedDay("   ", "2026-11-27"), { ok: true, date: null });
        assert.equal(optionalDeceasedDay("2026-11-28", "2026-11-27").ok, false);
        const known = optionalDeceasedDay("2026-11-01", "2026-11-27");
        assert.equal(known.ok, true);
        if (known.ok) assert.equal(known.date?.toISOString(), "2026-11-01T00:00:00.000Z");
    });

    it("rejects a future day and a day that is not a date", () => {
        assert.equal(deceasedDay("2026-11-28", "2026-11-27"), null);
        assert.equal(deceasedDay("2026-02-31", "2026-11-27"), null);
        assert.equal(deceasedDay("", "2026-11-27"), null);
    });
});
