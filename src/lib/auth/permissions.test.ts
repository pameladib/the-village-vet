import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { canCloseOwnerAccount, canManagePetLifecycle, canManageScheduleBlocks, canManageShop, canPermanentlyDeleteOwnerAccount, canPermanentlyDeletePet, canReactivateOwnerAccount, canSeeClinicalRecords } from "./permissions.ts";

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

    it("lets an owner archive only their own pet, and keeps permanent deletion of a chart with the veterinarian", () => {
        assert.equal(canManagePetLifecycle("OWNER", "owner", "owner"), true);
        assert.equal(canManagePetLifecycle("OWNER", "owner", "someone-else"), false);
        assert.equal(canManagePetLifecycle("ADMIN", "vet", "owner"), true);
        assert.equal(canManagePetLifecycle("SECONDARY_ADMIN", "assistant", "owner"), false);
        assert.equal(canPermanentlyDeletePet("OWNER", "owner", "owner", false), true);
        assert.equal(canPermanentlyDeletePet("OWNER", "owner", "owner", true), false);
        assert.equal(canPermanentlyDeletePet("ADMIN", "vet", "owner", true), true);
        assert.equal(canPermanentlyDeletePet("SECONDARY_ADMIN", "assistant", "owner", false), false);
    });

    it("lets an owner or an admin close an owner account, and keeps pets from being erased with it", () => {
        assert.equal(canCloseOwnerAccount("OWNER", "owner", "OWNER", "owner"), true);
        assert.equal(canCloseOwnerAccount("OWNER", "owner", "OWNER", "other"), false);
        assert.equal(canCloseOwnerAccount("ADMIN", "vet", "OWNER", "owner"), true);
        assert.equal(canCloseOwnerAccount("SECONDARY_ADMIN", "assistant", "OWNER", "owner"), false);
        assert.equal(canCloseOwnerAccount("ADMIN", "vet", "ADMIN", "vet"), false);
        assert.equal(canReactivateOwnerAccount("ADMIN", "OWNER"), true);
        assert.equal(canReactivateOwnerAccount("OWNER", "OWNER"), false);
        assert.equal(canReactivateOwnerAccount("SECONDARY_ADMIN", "OWNER"), false);
        assert.equal(canPermanentlyDeleteOwnerAccount("OWNER", "owner", "OWNER", "owner", 0), true);
        assert.equal(canPermanentlyDeleteOwnerAccount("ADMIN", "vet", "OWNER", "owner", 0), true);
        assert.equal(canPermanentlyDeleteOwnerAccount("ADMIN", "vet", "OWNER", "owner", 1), false);
        assert.equal(canPermanentlyDeleteOwnerAccount("SECONDARY_ADMIN", "assistant", "OWNER", "owner", 0), false);
    });
});
