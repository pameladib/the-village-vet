import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import {
    canChangePetPhoto,
    canDownloadMedicalDocument,
    canUploadMedicalDocument,
    canViewPetPhoto,
    documentRequestStatus,
    photoRequestStatus,
} from "../auth/permissions.ts";
import {
    DOCUMENT_MAX_BYTES,
    PHOTO_MAX_BYTES,
    acceptDocument,
    acceptPhoto,
    isPetObjectKey,
    isSafeObjectKey,
    objectKey,
    petPhotoSrc,
    prepareDocument,
    preparePhoto,
} from "./files.ts";

const petId = "850199a6-f4e8-4070-b08e-b4f2dd3c5616";
const ownerId = "owner-1";
const otherOwner = "owner-2";

function jpeg(size = 32) {
    const bytes = new Uint8Array(size);
    bytes[0] = 0xff;
    bytes[1] = 0xd8;
    bytes[2] = 0xff;
    return bytes;
}

function pdf() {
    return new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]);
}

describe("file validation", () => {
    it("accepts a jpeg and rejects a type that does not match its bytes", () => {
        assert.equal(preparePhoto("image/jpeg", 32).ok, true);
        assert.equal(acceptPhoto("image/jpeg", 32, jpeg()).ok, true);
        assert.equal(acceptPhoto("image/png", 32, jpeg()).ok, false);
        assert.equal(prepareDocument("application/pdf", 8).ok, true);
        assert.equal(acceptDocument("application/pdf", 8, pdf()).ok, true);
        assert.equal(acceptDocument("image/jpeg", 8, pdf()).ok, false);
    });

    it("rejects an empty file and a file over the size limit before upload", () => {
        assert.equal(preparePhoto("image/jpeg", 0).ok, false);
        assert.equal(preparePhoto("image/jpeg", PHOTO_MAX_BYTES + 1).ok, false);
        assert.equal(prepareDocument("application/pdf", DOCUMENT_MAX_BYTES + 1).ok, false);
        assert.equal(prepareDocument("image/gif", 8).ok, false);
    });

    it("rejects a stored object whose bytes do not match the declared type", () => {
        assert.equal(acceptDocument("application/pdf", 32, jpeg()).ok, false);
        assert.equal(acceptPhoto("image/jpeg", PHOTO_MAX_BYTES + 1, jpeg(PHOTO_MAX_BYTES + 1)).ok, false);
    });

    it("builds an object key the browser cannot choose", () => {
        const key = objectKey(petId, "jpg");
        assert.equal(isSafeObjectKey(key), true);
        assert.equal(isPetObjectKey(petId, key, "jpg"), true);
        assert.equal(isPetObjectKey(petId, key, "png"), false);
        assert.equal(key.startsWith(`${petId}/`), true);
        assert.throws(() => objectKey("../secrets", "jpg"), /That pet was not found/);
        assert.equal(isSafeObjectKey(`${petId}/../../secret.jpg`), false);
        assert.equal(petPhotoSrc(petId, key), `/pets/${petId}/photo`);
        assert.equal(petPhotoSrc(petId, `/pet-photos/${petId}.jpg`), null);
        assert.equal(petPhotoSrc(petId, key)?.includes("supabase"), false);
    });
});

describe("photo and document access", () => {
    it("lets an owner change only their own pet photo, and lets the veterinarian change any photo", () => {
        assert.equal(canChangePetPhoto("OWNER"), true);
        assert.equal(canChangePetPhoto("ADMIN"), true);
        assert.equal(canChangePetPhoto("SECONDARY_ADMIN"), false);
        assert.equal(canViewPetPhoto("OWNER", ownerId, ownerId), true);
        assert.equal(canViewPetPhoto("OWNER", otherOwner, ownerId), false);
        assert.equal(canViewPetPhoto("ADMIN", "vet", ownerId), true);
        assert.equal(canViewPetPhoto("SECONDARY_ADMIN", "assistant", ownerId), true);
    });

    it("keeps medical documents away from the assistant and from other owners", () => {
        assert.equal(canUploadMedicalDocument("ADMIN", "vet", ownerId), true);
        assert.equal(canUploadMedicalDocument("OWNER", ownerId, ownerId), true);
        assert.equal(canUploadMedicalDocument("OWNER", otherOwner, ownerId), false);
        assert.equal(canUploadMedicalDocument("SECONDARY_ADMIN", "assistant", ownerId), false);
        assert.equal(canDownloadMedicalDocument("ADMIN", "vet", ownerId), true);
        assert.equal(canDownloadMedicalDocument("OWNER", ownerId, ownerId), true);
        assert.equal(canDownloadMedicalDocument("OWNER", otherOwner, ownerId), false);
        assert.equal(canDownloadMedicalDocument("SECONDARY_ADMIN", "assistant", ownerId), false);
    });

    it("returns 401, 403, and 404 for unauthorized photo and document requests", () => {
        const pet = { ownerId, photoUrl: "storage:pet-photos/file" };
        assert.equal(photoRequestStatus({ signedIn: false, role: "OWNER", userId: ownerId, pet }), 401);
        assert.equal(photoRequestStatus({ signedIn: true, role: "OWNER", userId: otherOwner, pet }), 403);
        assert.equal(photoRequestStatus({ signedIn: true, role: "OWNER", userId: ownerId, pet: { ownerId, photoUrl: null } }), 404);
        assert.equal(photoRequestStatus({ signedIn: true, role: "OWNER", userId: ownerId, pet }), 200);

        assert.equal(documentRequestStatus({ signedIn: false, role: "OWNER", userId: ownerId, document: { ownerId } }), 401);
        assert.equal(documentRequestStatus({ signedIn: true, role: "SECONDARY_ADMIN", userId: "assistant", document: { ownerId } }), 403);
        assert.equal(documentRequestStatus({ signedIn: true, role: "SECONDARY_ADMIN", userId: "assistant", document: null }), 403);
        assert.equal(documentRequestStatus({ signedIn: true, role: "OWNER", userId: otherOwner, document: { ownerId } }), 403);
        assert.equal(documentRequestStatus({ signedIn: true, role: "OWNER", userId: ownerId, document: null }), 404);
        assert.equal(documentRequestStatus({ signedIn: true, role: "ADMIN", userId: "vet", document: { ownerId } }), 200);
    });

    it("does not turn a stored photo into a public storage url", () => {
        const key = objectKey(petId, "jpg");
        assert.equal(petPhotoSrc(petId, key), `/pets/${petId}/photo`);
        assert.equal(petPhotoSrc(petId, key)?.includes("supabase"), false);
        assert.equal(petPhotoSrc(petId, `${petId}/../../secret.jpg`), null);
    });
});

describe("service role key", () => {
    it("is not referenced by client components", () => {
        const root = path.resolve(import.meta.dirname, "../../..");
        const offenders: string[] = [];

        const secretName = ["SUPABASE", "SECRET", "KEY"].join("_");
        const publicSecret = `NEXT_PUBLIC_${secretName}`;

        function walk(directory: string) {
            for (const entry of readdirSync(directory)) {
                if (entry === "node_modules" || entry === ".next") continue;
                const full = path.join(directory, entry);
                if (statSync(full).isDirectory()) {
                    walk(full);
                    continue;
                }
                if (!/\.(ts|tsx)$/.test(entry) || entry.endsWith(".test.ts")) continue;
                const text = readFileSync(full, "utf8");
                const relative = path.relative(root, full);
                const client = text.includes("use client");
                if (client && (text.includes(secretName) || text.includes("lib/storage/supabase"))) {
                    offenders.push(relative);
                }
                if (text.includes(publicSecret)) offenders.push(relative);
                if (text.includes(secretName) && relative !== "src/lib/storage/supabase.ts") {
                    offenders.push(relative);
                }
            }
        }

        walk(path.join(root, "src"));
        assert.deepEqual(offenders, []);
    });
});
