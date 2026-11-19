import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { filterUpcoming, spanBounds, upcomingSpan } from "./upcoming-filter.ts";

const now = new Date("2026-11-19T10:00:00.000Z");

function at(iso: string) {
    return { id: iso, startAt: new Date(iso) };
}

describe("upcoming appointment filter", () => {
    const visits = [
        at("2026-11-19T20:00:00.000Z"),
        at("2026-11-19T22:00:00.000Z"),
        at("2026-11-20T07:00:00.000Z"),
        at("2026-11-26T20:00:00.000Z"),
        at("2026-11-26T22:30:00.000Z"),
    ];

    it("keeps every upcoming appointment, earliest first", () => {
        const shown = filterUpcoming(visits, upcomingSpan("all", null, now));
        assert.deepEqual(shown.map((visit) => visit.id), visits.map((visit) => visit.id));
    });

    it("keeps tomorrow only", () => {
        const shown = filterUpcoming(visits, upcomingSpan("tomorrow", null, now));
        assert.deepEqual(shown.map((visit) => visit.id), ["2026-11-19T22:00:00.000Z", "2026-11-20T07:00:00.000Z"]);
    });

    it("keeps the seven calendar days that start tomorrow", () => {
        const span = upcomingSpan("week", null, now);
        assert.deepEqual(span, { from: "2026-11-20", to: "2026-11-26" });
        assert.deepEqual(spanBounds(span).start.toISOString(), "2026-11-19T22:00:00.000Z");
        assert.deepEqual(spanBounds(span).end.toISOString(), "2026-11-26T22:00:00.000Z");
        const shown = filterUpcoming(visits, span);
        assert.deepEqual(shown.map((visit) => visit.id), [
            "2026-11-19T22:00:00.000Z",
            "2026-11-20T07:00:00.000Z",
            "2026-11-26T20:00:00.000Z",
        ]);
    });

    it("keeps one future date and waits until that date is chosen", () => {
        const shown = filterUpcoming(visits, upcomingSpan("date", "2026-11-26", now));
        assert.deepEqual(shown.map((visit) => visit.id), ["2026-11-26T20:00:00.000Z"]);
        assert.equal(upcomingSpan("date", null, now), "choose");
        assert.equal(upcomingSpan("date", "2026-11-19", now), "choose");
    });
});
