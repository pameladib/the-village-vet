import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MEDICAL_DOCUMENTS_BUCKET, PET_PHOTOS_BUCKET } from "../storage/files.ts";
import { petHasHistory, petStorageObjects } from "./removal.ts";

describe("pet removal", () => {
    it("treats any past record as history", () => {
        assert.equal(petHasHistory({}), false);
        assert.equal(petHasHistory({ appointments: 0, documents: 0 }), false);
        assert.equal(petHasHistory({ appointments: 1 }), true);
        assert.equal(petHasHistory({ careReminders: 1 }), true);
        assert.equal(petHasHistory({ visitFollowUps: 1 }), true);
    });

    it("lists the profile photo and each medical document once", () => {
        const files = petStorageObjects({
            photoUrl: "11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222.jpg",
            documents: [
                { storedName: "11111111-1111-4111-8111-111111111111/33333333-3333-4333-8333-333333333333.pdf" },
                { storedName: "11111111-1111-4111-8111-111111111111/33333333-3333-4333-8333-333333333333.pdf" },
                { storedName: "   " },
            ],
        });
        assert.deepEqual(files, [
            { bucket: PET_PHOTOS_BUCKET, objectKey: "11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222.jpg" },
            { bucket: MEDICAL_DOCUMENTS_BUCKET, objectKey: "11111111-1111-4111-8111-111111111111/33333333-3333-4333-8333-333333333333.pdf" },
        ]);
    });
});
