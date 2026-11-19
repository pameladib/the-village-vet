import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { beirutInstant } from "../appointments/availability.ts";
import { canRecordPetWeight, canViewPetWeights } from "../auth/permissions.ts";
import { formatHistoryWeight, formatWeightKg, historyWeightsFromRecords, parseWeightKg, petWeightFromGrams, visitWeightPlan, weightFollowsVisit, weightInstant, weightNotes } from "./weight.ts";

const now = new Date("2026-11-19T10:00:00.000Z");

describe("pet weight measurements", () => {
    it("keeps a positive weight to two decimal places", () => {
        assert.equal(parseWeightKg("4.25"), "4.250");
        assert.equal(parseWeightKg(" 4.5 "), "4.500");
        assert.equal(parseWeightKg("0.347"), "0.347");
        assert.equal(parseWeightKg(""), null);
        assert.equal(parseWeightKg("0"), "invalid");
        assert.equal(parseWeightKg("-1"), "invalid");
        assert.equal(parseWeightKg("4.2567"), "invalid");
        assert.equal(parseWeightKg("1000"), "invalid");
        assert.equal(formatWeightKg("4.50"), "4.5");
        assert.equal(formatWeightKg("4.00"), "4");
        assert.deepEqual(formatHistoryWeight("0.347"), { amount: "347", unit: "g" });
        assert.deepEqual(formatHistoryWeight("0.800"), { amount: "800", unit: "g" });
        assert.deepEqual(formatHistoryWeight("4.250"), { amount: "4.25", unit: "kg" });
    });

    it("copies a registration weight into the history once", () => {
        assert.equal(petWeightFromGrams(4250), "4.250");
        assert.equal(petWeightFromGrams(800), "0.800");
        assert.equal(petWeightFromGrams(347), "0.347");
        assert.equal(petWeightFromGrams(4), "0.004");
        const recordedAt = new Date("2026-11-19T08:00:00.000Z");
        const again = historyWeightsFromRecords(
            [{ weightGrams: 4250, recordedAt }],
            [{ weight: "4.25", recordedAt }],
        );
        assert.deepEqual(again, []);
        assert.deepEqual(historyWeightsFromRecords([{ weightGrams: 347, recordedAt }], [{ weight: "0.35", recordedAt }]), []);
        assert.deepEqual(historyWeightsFromRecords([{ weightGrams: 4250, recordedAt }], []), [
            { weight: "4.250", recordedAt },
        ]);
    });

    it("uses the clinic calendar and refuses a future date", () => {
        assert.equal(weightInstant("2026-11-19", now)?.toISOString(), "2026-11-19T10:00:00.000Z");
        assert.equal(weightInstant("2026-11-18", now)?.toISOString(), "2026-11-18T10:00:00.000Z");
        assert.equal(weightInstant("2026-11-20", now), null);
        assert.equal(weightInstant("tomorrow", now), null);
    });

    it("limits notes", () => {
        assert.equal(weightNotes("  after the visit  "), "after the visit");
        assert.equal(weightNotes("   "), null);
        assert.equal(weightNotes("a".repeat(1001)), "invalid");
    });

    it("updates one visit measurement instead of adding another", () => {
        assert.deepEqual(visitWeightPlan(false, ""), { action: "none" });
        assert.deepEqual(visitWeightPlan(false, "4.25"), { action: "create", weight: "4.250" });
        assert.deepEqual(visitWeightPlan(true, "4.50"), { action: "update", weight: "4.500" });
        assert.deepEqual(visitWeightPlan(true, ""), { action: "delete" });
        assert.deepEqual(visitWeightPlan(true, "4.2567"), { action: "invalid" });
    });

    it("keeps a visit measurement on the visit date", () => {
        const visitedAt = beirutInstant("2026-11-18", 15, 30);
        assert.equal(weightFollowsVisit(visitedAt, visitedAt), true);
        assert.equal(weightFollowsVisit(beirutInstant("2026-11-18", 12, 0), visitedAt), true);
        assert.equal(weightFollowsVisit(beirutInstant("2026-11-17", 12, 0), visitedAt), false);
    });

    it("lets the veterinarian record weight and the owner only read their own pet", () => {
        assert.equal(canRecordPetWeight("ADMIN"), true);
        assert.equal(canRecordPetWeight("OWNER"), false);
        assert.equal(canRecordPetWeight("SECONDARY_ADMIN"), false);
        assert.equal(canViewPetWeights("ADMIN", "vet", "owner"), true);
        assert.equal(canViewPetWeights("OWNER", "owner", "owner"), true);
        assert.equal(canViewPetWeights("OWNER", "owner", "someone-else"), false);
        assert.equal(canViewPetWeights("SECONDARY_ADMIN", "assistant", "owner"), false);
    });
});
