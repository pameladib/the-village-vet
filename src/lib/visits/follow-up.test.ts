import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { canSeeClinicalRecords } from "../auth/permissions.ts";
import { dateOnlyUtc } from "../clinic/vaccines.ts";
import { applyFollowUp, attentionFollowUpCount, followUpAttention, followUpBuckets, followUpChatLink, followUpCreateTab, followUpDueThrough, followUpText, outstandingFollowUps } from "./follow-up.ts";

const now = new Date("2026-11-19T10:00:00.000Z");
const today = dateOnlyUtc("2026-11-19")!;
const yesterday = dateOnlyUtc("2026-11-18")!;
const older = dateOnlyUtc("2026-11-10")!;
const tomorrow = dateOnlyUtc("2026-11-20")!;

describe("visit follow-ups", () => {
    it("shows a follow-up due today and keeps older overdue reminders first", () => {
        const shown = outstandingFollowUps([
            { id: "today", status: "PENDING", dueOn: today },
            { id: "tomorrow", status: "PENDING", dueOn: tomorrow },
            { id: "yesterday", status: "PENDING", dueOn: yesterday },
            { id: "older", status: "PENDING", dueOn: older },
        ], now);
        assert.deepEqual(shown.map((row) => row.id), ["older", "yesterday", "today"]);
    });

    it("counts overdue, due today, and upcoming the same way for every surface", () => {
        const groups = followUpBuckets([
            { status: "PENDING", dueOn: older },
            { status: "PENDING", dueOn: today },
            { status: "PENDING", dueOn: tomorrow },
            { status: "COMPLETED", dueOn: yesterday },
            { status: "CANCELLED", dueOn: yesterday },
        ], now);
        assert.equal(groups.overdue.length, 1);
        assert.equal(groups.due.length, 1);
        assert.equal(groups.upcoming.length, 1);
        assert.equal(attentionFollowUpCount({ overdue: groups.overdue.length, due: groups.due.length }), 2);
        assert.equal(followUpDueThrough(now)?.toISOString(), "2026-11-19T00:00:00.000Z");
        const text = {
            overdue: (count: number) => `${count} overdue`,
            due: (count: number) => `${count} due today`,
            upcoming: (count: number) => `${count} upcoming`,
            oneDue: "1 reminder due today",
            oneUpcoming: "1 upcoming reminder",
            manyUpcoming: (count: number) => `${count} upcoming reminders`,
        };
        assert.equal(followUpAttention({ overdue: 2, due: 1, upcoming: 0 }, text), "2 overdue · 1 due today");
        assert.equal(followUpAttention({ overdue: 0, due: 1, upcoming: 0 }, text), "1 reminder due today");
        assert.equal(followUpAttention({ overdue: 0, due: 0, upcoming: 3 }, text), "3 upcoming reminders");
    });

    it("hides completed, cancelled, and future follow-ups", () => {
        const shown = outstandingFollowUps([
            { id: "done", status: "COMPLETED", dueOn: yesterday },
            { id: "cancelled", status: "CANCELLED", dueOn: yesterday },
            { id: "later", status: "PENDING", dueOn: tomorrow },
        ], now);
        assert.equal(shown.length, 0);
    });

    it("opens WhatsApp with a Lebanese number and the message, without changing the reminder", () => {
        const message = followUpText(
            "Hello {owner}, this is {clinic}. We're following up on {pet}'s recent visit. {ask}",
            { owner: "Pamela", pet: "Max", clinic: "The Village Vet", ask: "How is he doing?" },
        );
        const link = followUpChatLink("03 123 456", message);
        assert.equal(link?.startsWith("https://wa.me/9613123456?text="), true);
        assert.equal(decodeURIComponent(link!.split("?text=")[1]), message);
        assert.equal(followUpChatLink("+961 3 123 456", message), link);
        assert.equal(followUpChatLink("009613123456", message), link);
        assert.equal(followUpChatLink("", message), null);
        assert.equal(followUpChatLink("123", message), null);
        assert.equal(applyFollowUp("PENDING", "complete")?.status, "COMPLETED");
    });

    it("completes, reschedules, or cancels only a pending reminder", () => {
        assert.deepEqual(applyFollowUp("PENDING", "complete"), { status: "COMPLETED" });
        assert.deepEqual(applyFollowUp("PENDING", "cancel"), { status: "CANCELLED" });
        assert.equal(applyFollowUp("PENDING", "reschedule", "2026-11-25")?.dueOn.toISOString(), "2026-11-25T00:00:00.000Z");
        assert.equal(applyFollowUp("PENDING", "reschedule", "tomorrow"), null);
        assert.equal(followUpCreateTab("2026-11-18", now), null);
        assert.equal(followUpCreateTab("2026-11-19", now), "today");
        assert.equal(followUpCreateTab("2026-11-20", now), "upcoming");
        assert.equal(followUpCreateTab("tomorrow", now), null);
        assert.equal(applyFollowUp("COMPLETED", "reschedule", "2026-11-25"), null);
        assert.equal(applyFollowUp("CANCELLED", "complete"), null);
    });

    it("keeps clinical follow-ups with the veterinarian", () => {
        assert.equal(canSeeClinicalRecords("ADMIN"), true);
        assert.equal(canSeeClinicalRecords("SECONDARY_ADMIN"), false);
    });

    it("does not send notifications", () => {
        const followUp = readFileSync(new URL("./follow-up.ts", import.meta.url), "utf8");
        const actions = readFileSync(new URL("../actions/follow-ups.ts", import.meta.url), "utf8");
        for (const source of [followUp, actions]) {
            assert.equal(source.includes("notify"), false);
            assert.equal(source.includes("web-push"), false);
            assert.equal(source.includes("mailto:"), false);
        }
    });
});
