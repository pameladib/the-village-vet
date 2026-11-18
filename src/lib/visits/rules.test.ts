import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { awaitingRecord, canCompleteClinical, canMarkGroomingDone, canMarkMissed } from "./rules.ts";

const past = new Date("2026-11-18T08:00:00.000Z");
const now = new Date("2026-11-18T10:00:00.000Z");
const future = new Date("2026-11-18T12:00:00.000Z");

describe("appointment outcomes", () => {
    it("counts a booked appointment once its time has passed", () => {
        assert.equal(awaitingRecord("BOOKED", past, now), true);
        assert.equal(awaitingRecord("BOOKED", future, now), false);
        assert.equal(awaitingRecord("COMPLETED", past, now), false);
        assert.equal(awaitingRecord("CANCELLED", past, now), false);
        assert.equal(awaitingRecord("EXPIRED", past, now), false);
    });

    it("completes veterinary visits and operations, and only marks grooming done", () => {
        assert.equal(canCompleteClinical("BOOKED", "VETERINARY_VISIT"), true);
        assert.equal(canCompleteClinical("BOOKED", "OPERATION"), true);
        assert.equal(canCompleteClinical("BOOKED", "GROOMING"), false);
        assert.equal(canCompleteClinical("COMPLETED", "VETERINARY_VISIT"), false);
        assert.equal(canMarkGroomingDone("BOOKED", "GROOMING"), true);
        assert.equal(canMarkGroomingDone("BOOKED", "VETERINARY_VISIT"), false);
    });

    it("marks a missed appointment only after the scheduled time", () => {
        assert.equal(canMarkMissed("BOOKED", past, now), true);
        assert.equal(canMarkMissed("BOOKED", future, now), false);
        assert.equal(canMarkMissed("CANCELLED", past, now), false);
    });
});
