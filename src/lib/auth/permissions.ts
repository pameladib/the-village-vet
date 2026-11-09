// The clinic-wide care list stays with the veterinarian. The assistant can run the diary and the shop.
// An owner manages medical information for their own pets on the pet pages.
export function canSeeClinicalRecords(role: string) {
    return role === "ADMIN";
}

export function canManageScheduleBlocks(role: string) {
    return role === "ADMIN";
}

export function canManageShop(role: string) {
    return role === "ADMIN" || role === "SECONDARY_ADMIN";
}

export function canChangePetPhoto(role: string) {
    return role === "OWNER" || role === "ADMIN";
}

// The assistant can see a photo on the diary. They cannot change it.
export function canViewPetPhoto(role: string, userId: string, ownerId: string) {
    if (role === "ADMIN" || role === "SECONDARY_ADMIN") return true;
    return role === "OWNER" && userId === ownerId;
}

export function canUploadMedicalDocument(role: string, userId: string, ownerId: string) {
    if (role === "ADMIN") return true;
    return role === "OWNER" && userId === ownerId;
}

export function canDownloadMedicalDocument(role: string, userId: string, ownerId: string) {
    if (role === "SECONDARY_ADMIN") return false;
    if (role === "ADMIN") return true;
    return role === "OWNER" && userId === ownerId;
}

export function photoRequestStatus(input: {
    signedIn: boolean;
    role: string;
    userId: string;
    pet: { ownerId: string; photoUrl: string | null } | null;
}) {
    if (!input.signedIn) return 401;
    if (!input.pet?.photoUrl) return 404;
    if (!canViewPetPhoto(input.role, input.userId, input.pet.ownerId)) return 403;
    return 200;
}

export function documentRequestStatus(input: {
    signedIn: boolean;
    role: string;
    userId: string;
    document: { ownerId: string } | null;
}) {
    if (!input.signedIn) return 401;
    if (input.role === "SECONDARY_ADMIN") return 403;
    if (!input.document) return 404;
    if (!canDownloadMedicalDocument(input.role, input.userId, input.document.ownerId)) return 403;
    return 200;
}
