import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { canManageScheduleBlocks, canManageShop, canSeeClinicalRecords } from "./permissions.ts";

describe("staff permissions", () => {
    it("keeps clinical records with the veterinarian", () => {
        assert.equal(canSeeClinicalRecords("ADMIN"), true);
        assert.equal(canSeeClinicalRecords("SECONDARY_ADMIN"), false);
        assert.equal(canSeeClinicalRecords("OWNER"), false);
    });

    it("lets the assistant run the shop but not close the clinic", () => {
        assert.equal(canManageShop("SECONDARY_ADMIN"), true);
        assert.equal(canManageScheduleBlocks("SECONDARY_ADMIN"), false);
        assert.equal(canManageScheduleBlocks("ADMIN"), true);
    });
});
