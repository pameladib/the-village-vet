import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Copy } from "../i18n.ts";
import { careReminder, reminderClock, visitReminder } from "./reminder-text.ts";

const english = {
    noticeApptToday: "Appointment today",
    noticeApptTomorrow: "Appointment tomorrow",
    noticeVisitToday: "You have {visit} today at {time}.",
    noticeVisitTomorrow: "You have {visit} tomorrow at {time}.",
    noticeVisitOperation: "an operation visit",
    noticeVisitVet: "a veterinary visit",
    noticeVisitGrooming: "a grooming visit",
    noticeVisitShower: "a shower",
    noticeVisitHaircut: "a haircut",
    noticeVisitBoth: "a shower and haircut",
    noticeCareDue: "Care is due today",
    noticeCareStill: "Care is still due",
    noticeCareDueBody: "{name} has {item}.",
    noticeCareVaccine: "a vaccination due: {dose}",
    noticeCareDeworming: "a deworming due",
    noticeCareFlea: "a flea and tick treatment due",
    doseFirst: "First dose",
    doseSecond: "Second dose",
    doseAnnual: "Annual dose",
} as Copy;

const arabic = {
    ...english,
    noticeApptToday: "موعد اليوم",
    noticeVisitToday: "لديكم {visit} اليوم عند {time}.",
    noticeVisitOperation: "عملية",
    noticeCareDueBody: "لدى {name} {item}.",
    noticeCareVaccine: "لقاح مستحق: {dose}",
    doseFirst: "الجرعة الأولى",
} as Copy;

const eleven = new Date("2026-11-18T09:00:00.000Z");
const elevenThirty = new Date("2026-11-18T09:30:00.000Z");

describe("reminder wording", () => {
    it("names the visit and uses 11 AM for an hour with no minutes", () => {
        const notice = visitReminder(english, "en", "today", "OPERATION", null, eleven);
        assert.equal(notice.title, "Appointment today");
        assert.equal(notice.body, "You have an operation visit today at 11 AM.");
        assert.equal(reminderClock(elevenThirty, "en"), "11:30 AM");
    });

    it("names a vaccination dose and a flea treatment", () => {
        assert.equal(careReminder(english, "Luna", "VACCINATION", "SECOND", false).body, "Luna has a vaccination due: Second dose.");
        assert.equal(careReminder(english, "Luna", "FLEA_TREATMENT", null, true).body, "Luna has a flea and tick treatment due.");
        assert.equal(careReminder(english, "Luna", "DEWORMING", "DEWORMING", false).body, "Luna has a deworming due.");
    });

    it("uses the Arabic sentences", () => {
        const notice = visitReminder(arabic, "ar", "today", "OPERATION", null, eleven);
        assert.equal(notice.title, "موعد اليوم");
        assert.match(notice.body, /^لديكم عملية اليوم عند /);
        assert.equal(careReminder(arabic, "Luna", "VACCINATION", "FIRST", false).body, "لدى Luna لقاح مستحق: الجرعة الأولى.");
    });
});
