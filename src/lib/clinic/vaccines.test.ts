import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { nextVaccineDue } from "./vaccines.ts";

const first = new Date("2026-01-01T00:00:00.000Z");

describe("vaccine follow-ups", () => {
    it("schedules a cat's second dose three weeks after the first", () => {
        const next = nextVaccineDue("CAT", "FIRST", first);
        assert.equal(next?.dose, "SECOND");
        assert.equal(next?.dueAt.toISOString(), "2026-01-22T00:00:00.000Z");
    });

    it("schedules a cat's annual dose 11 months after the second", () => {
        const next = nextVaccineDue("CAT", "SECOND", first);
        assert.equal(next?.dose, "ANNUAL");
        assert.equal(next?.dueAt.toISOString(), "2026-12-01T00:00:00.000Z");
    });

    it("schedules a dog's third dose three weeks after the second", () => {
        const next = nextVaccineDue("DOG", "SECOND", first);
        assert.equal(next?.dose, "THIRD");
        assert.equal(next?.dueAt.toISOString(), "2026-01-22T00:00:00.000Z");
    });

    it("does not invent a third cat dose", () => {
        assert.equal(nextVaccineDue("CAT", "THIRD", first), null);
    });
});
