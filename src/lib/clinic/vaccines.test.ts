import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
    addCalendarMonths,
    dateOnlyUtc,
    doseConflict,
    formatDateOnly,
    nextVaccineDue,
    planFollowUp,
} from "./vaccines.ts";

const first = new Date("2026-01-01T00:00:00.000Z");

describe("vaccine follow-ups", () => {
    it("schedules a cat's second dose three weeks after the first", () => {
        const next = nextVaccineDue("CAT", "FIRST", first);
        assert.equal(next?.dose, "SECOND");
        assert.equal(next?.dueAt.toISOString(), "2026-01-22T00:00:00.000Z");
    });

    it("schedules a cat's first annual dose 11 months after the second", () => {
        const next = nextVaccineDue("CAT", "SECOND", first);
        assert.equal(next?.dose, "ANNUAL_1");
        assert.equal(next?.dueAt.toISOString(), "2026-12-01T00:00:00.000Z");
    });

    it("schedules a dog's second dose three weeks after the first", () => {
        const next = nextVaccineDue("DOG", "FIRST", first);
        assert.equal(next?.dose, "SECOND");
        assert.equal(next?.dueAt.toISOString(), "2026-01-22T00:00:00.000Z");
    });

    it("schedules a dog's third dose three weeks after the second", () => {
        const next = nextVaccineDue("DOG", "SECOND", first);
        assert.equal(next?.dose, "THIRD");
        assert.equal(next?.dueAt.toISOString(), "2026-01-22T00:00:00.000Z");
    });

    it("schedules a dog's first annual dose 11 months after the third", () => {
        const next = nextVaccineDue("DOG", "THIRD", first);
        assert.equal(next?.dose, "ANNUAL_1");
        assert.equal(next?.dueAt.toISOString(), "2026-12-01T00:00:00.000Z");
    });

    it("keeps later annual doses 11 months apart", () => {
        assert.equal(nextVaccineDue("DOG", "ANNUAL", first, 0)?.dose, "ANNUAL_2");
        assert.equal(nextVaccineDue("CAT", "ANNUAL", first, 1)?.dose, "ANNUAL_3");
        assert.equal(nextVaccineDue("DOG", "ANNUAL", first, 2)?.dose, "ANNUAL_NEXT");
        assert.equal(nextVaccineDue("CAT", "ANNUAL", first, 5)?.dueAt.toISOString(), "2026-12-01T00:00:00.000Z");
    });

    it("does not invent a third cat dose or treat a missing earlier dose as completed", () => {
        assert.equal(nextVaccineDue("CAT", "THIRD", first), null);
        assert.equal(nextVaccineDue("CAT", "ANNUAL", first, 0)?.dose, "ANNUAL_2");
        assert.equal(nextVaccineDue("DOG", "FIRST", first)?.dose, "SECOND");
    });

    it("clamps month-end dates instead of spilling into the next month", () => {
        assert.equal(formatDateOnly(addCalendarMonths(new Date("2026-03-31T00:00:00.000Z"), 11)), "2027-02-28");
        assert.equal(formatDateOnly(addCalendarMonths(new Date("2023-03-31T00:00:00.000Z"), 11)), "2024-02-29");
        assert.equal(formatDateOnly(addCalendarMonths(dateOnlyUtc("2026-01-31")!, 1)), "2026-02-28");
    });
});

describe("care reminder plans", () => {
    const due = new Date("2026-12-01T00:00:00.000Z");

    it("rejects a repeated primary dose and a cat's third dose", () => {
        const existing = [{ id: "a", type: "FIRST", administeredAt: "2026-01-01" }];
        assert.equal(doseConflict("DOG", existing, { type: "FIRST", administeredAt: "2026-02-01" }), "duplicate");
        assert.equal(doseConflict("CAT", [], { type: "THIRD", administeredAt: "2026-01-01" }), "species");
        assert.equal(doseConflict("DOG", existing, { id: "a", type: "FIRST", administeredAt: "2026-01-01" }), null);
    });

    it("allows another annual on a later day and keeps the same day as one dose", () => {
        const existing = [{ id: "a", type: "ANNUAL", administeredAt: "2026-11-19" }];
        assert.equal(doseConflict("CAT", existing, { type: "ANNUAL", administeredAt: "2027-10-19" }), null);
        assert.equal(doseConflict("CAT", existing, { type: "ANNUAL", administeredAt: "2026-11-19" }), "annualDate");
    });

    it("updates the linked reminder instead of creating another", () => {
        assert.deepEqual(planFollowUp({ linked: { id: "r", open: true }, openForKind: { id: "r" }, nextDue: due }), { type: "update", id: "r" });
    });

    it("removes a pending reminder when the due date is cleared", () => {
        assert.deepEqual(planFollowUp({ linked: { id: "r", open: true }, openForKind: { id: "r" }, nextDue: null }), { type: "delete", id: "r" });
    });

    it("does not recreate a completed reminder", () => {
        assert.deepEqual(planFollowUp({ linked: { id: "r", open: false }, openForKind: null, nextDue: due }), { type: "update", id: "r" });
        assert.deepEqual(planFollowUp({ linked: { id: "r", open: false }, openForKind: { id: "newer" }, nextDue: due }), { type: "update", id: "r" });
    });

    it("completes the previous reminder and opens the next only when a date is set", () => {
        assert.deepEqual(planFollowUp({ linked: null, openForKind: { id: "old" }, nextDue: due }), { type: "replace", completeId: "old" });
        assert.deepEqual(planFollowUp({ linked: null, openForKind: { id: "old" }, nextDue: null }), { type: "complete", id: "old" });
        assert.deepEqual(planFollowUp({ linked: null, openForKind: null, nextDue: null }), { type: "none" });
    });
});
