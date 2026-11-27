// The clinic-wide care list stays with the veterinarian. The assistant can run the diary and the shop.
// An owner manages medical information for their own pets on the pet pages.
export function canSeeClinicalRecords(role: string) {
    return role === "ADMIN";
}

export function canRecordPetWeight(role: string) {
    return role === "ADMIN";
}

export function canViewPetWeights(role: string, userId: string, ownerId: string) {
    if (role === "ADMIN") return true;
    if (role === "SECONDARY_ADMIN") return false;
    return role === "OWNER" && userId === ownerId;
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

// Archive, restore, and delete stay with the pet's owner and the veterinarian.
export function canManagePetLifecycle(role: string, userId: string, ownerId: string) {
    if (role === "ADMIN") return true;
    return role === "OWNER" && userId === ownerId;
}

// Only an owner account can be closed. The owner can close their own. An admin can close any owner account.
export function canCloseOwnerAccount(actorRole: string, actorId: string, ownerRole: string, ownerId: string) {
    if (ownerRole !== "OWNER") return false;
    if (actorRole === "ADMIN") return true;
    return actorRole === "OWNER" && actorId === ownerId;
}

export function canReactivateOwnerAccount(actorRole: string, ownerRole: string) {
    return actorRole === "ADMIN" && ownerRole === "OWNER";
}

// Pets keep the medical record, so the account stays. Appointments and shop orders do not block this.
export function canPermanentlyDeleteOwnerAccount(actorRole: string, actorId: string, ownerRole: string, ownerId: string, petCount: number) {
    if (petCount > 0) return false;
    return canCloseOwnerAccount(actorRole, actorId, ownerRole, ownerId);
}

// An owner can permanently delete only a pet that has no history. The veterinarian can delete either way.
export function canPermanentlyDeletePet(role: string, userId: string, ownerId: string, hasHistory: boolean) {
    if (!canManagePetLifecycle(role, userId, ownerId)) return false;
    if (role === "ADMIN") return true;
    return !hasHistory;
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
