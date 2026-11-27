import { MEDICAL_DOCUMENTS_BUCKET, PET_PHOTOS_BUCKET } from "../storage/files";

export const historyRelations = [
    "appointments",
    "medicalVisits",
    "vaccinations",
    "treatments",
    "weightRecords",
    "weights",
    "careReminders",
    "visitFollowUps",
    "documents",
] as const;

export type PetHistoryCounts = Partial<Record<(typeof historyRelations)[number], number>>;

// Cancelled visits and completed reminders still count. The check is the whole chart, not the open items.
export function petHasHistory(counts: PetHistoryCounts) {
    return historyRelations.some((key) => (counts[key] ?? 0) > 0);
}

export function petStorageObjects(pet: { photoUrl: string | null; documents: { storedName: string }[] }) {
    const files: { bucket: string; objectKey: string }[] = [];
    const seen = new Set<string>();
    function add(bucket: string, objectKey: string | null) {
        const key = objectKey?.trim();
        if (!key || seen.has(`${bucket}:${key}`)) return;
        seen.add(`${bucket}:${key}`);
        files.push({ bucket, objectKey: key });
    }
    add(PET_PHOTOS_BUCKET, pet.photoUrl);
    for (const document of pet.documents) add(MEDICAL_DOCUMENTS_BUCKET, document.storedName);
    return files;
}
