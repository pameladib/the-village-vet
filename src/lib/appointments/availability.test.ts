import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getAvailableStarts, hourInBeirut } from "./availability.ts";

const monday = "2027-01-04";
const saturday = "2027-01-02";
const sunday = "2027-01-03";

function labels(starts: Date[]) {
    return starts.map((start) =>
        new Intl.DateTimeFormat("en-GB", {
            timeZone: "Asia/Beirut",
            hour: "2-digit",
            minute: "2-digit",
            hourCycle: "h23",
        }).format(start),
    );
}

function at(day: string, time: string) {
    const starts = getAvailableStarts("VETERINARY_VISIT", "CAT", day, [], []);
    const match = starts.find((start) => labels([start])[0] === time);
    assert.ok(match, `missing ${time} on ${day}`);
    return match;
}

describe("Beirut clock", () => {
    it("is 8:00 at 06:00 UTC in winter and 05:00 UTC in summer", () => {
        assert.equal(hourInBeirut(new Date("2027-01-15T06:00:00.000Z")), 8);
        assert.equal(hourInBeirut(new Date("2027-07-15T05:00:00.000Z")), 8);
        assert.equal(hourInBeirut(new Date("2027-01-15T05:00:00.000Z")), 7);
        assert.equal(hourInBeirut(new Date("2027-07-15T06:00:00.000Z")), 9);
    });
});

describe("clinic hours", () => {
    it("closes Sunday", () => {
        assert.deepEqual(getAvailableStarts("VETERINARY_VISIT", "CAT", sunday, [], []), []);
    });

    it("ends weekday veterinary visits at 17:30 and Saturday veterinary visits at 13:30", () => {
        assert.deepEqual(labels(getAvailableStarts("VETERINARY_VISIT", "DOG", monday, [], [])).at(-1), "17:30");
        assert.deepEqual(labels(getAvailableStarts("VETERINARY_VISIT", "DOG", saturday, [], [])).at(-1), "13:30");
    });

    it("ends weekday grooming at 16:00 and Saturday grooming at 12:00", () => {
        assert.deepEqual(labels(getAvailableStarts("GROOMING", "CAT", monday, [], [])).at(-1), "16:00");
        assert.deepEqual(labels(getAvailableStarts("GROOMING", "DOG", saturday, [], [])).at(-1), "12:00");
    });

    it("rejects a past day", () => {
        assert.deepEqual(getAvailableStarts("VETERINARY_VISIT", "CAT", "2020-01-06", [], []), []);
    });
});

describe("operations", () => {
    it("offers a cat 9:00 and 10:00, and a dog 9:00 only", () => {
        assert.deepEqual(labels(getAvailableStarts("OPERATION", "CAT", monday, [], [])), ["09:00", "10:00"]);
        assert.deepEqual(labels(getAvailableStarts("OPERATION", "DOG", monday, [], [])), ["09:00"]);
    });

    it("lets a dog operation block both cat windows", () => {
        const dog = at(monday, "09:00");
        const starts = getAvailableStarts("OPERATION", "CAT", monday, [{ type: "OPERATION", startAt: dog, duration: 120 } as never], []);
        assert.deepEqual(starts, []);
    });
});

describe("separate calendars and blocks", () => {
    it("lets grooming overlap a vet visit", () => {
        const checkup = at(monday, "09:00");
        const grooming = labels(getAvailableStarts("GROOMING", "CAT", monday, [{ type: "VETERINARY_VISIT", startAt: checkup, duration: 30 } as never], []));
        assert.equal(grooming[0], "09:00");
    });

    it("keeps two vet visits from sharing the same half hour", () => {
        const checkup = at(monday, "09:00");
        const next = labels(getAvailableStarts("VETERINARY_VISIT", "CAT", monday, [{ type: "VETERINARY_VISIT", startAt: checkup, duration: 30 } as never], []));
        assert.equal(next[0], "09:30");
    });

    it("applies a clinic block to vet visits and leaves grooming open", () => {
        const start = at(monday, "09:00");
        const end = at(monday, "11:00");
        const block = { startAt: start, endAt: end, scope: "CLINIC" as const };
        assert.equal(labels(getAvailableStarts("VETERINARY_VISIT", "CAT", monday, [], [block as never]))[0], "11:00");
        assert.equal(labels(getAvailableStarts("GROOMING", "CAT", monday, [], [block as never]))[0], "09:00");
    });
});
