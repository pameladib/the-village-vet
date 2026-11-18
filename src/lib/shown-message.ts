import type { Copy } from "@/lib/i18n";

const known = {
    "Name is required": "errPetName",
    "Age must be a non-negative number": "errPetAge",
    "Photo must be under 5 MB": "errPetPhotoSize",
    "Use a JPEG, PNG, WEBP, or GIF": "errPetPhotoType",
    "Weight must be a non-negative number": "errPetWeight",
    "Cats do not have a third vaccine dose.": "errPetThird",
    "The next due date cannot be before the dose was given.": "errDueBefore",
    "You cannot change this photo.": "errPhotoLocked",
    "Could not save this pet.": "petSaveFail",
    "You need to sign in.": "errSignIn",
    "We couldn't find this pet.": "errPetMissing",
    "Could not cancel this appointment.": "errCancel",
    "This appointment can no longer be cancelled.": "errCancelClosed",
    "We couldn't find this appointment.": "errApptMissing",
    "Could not change this appointment.": "errMoveFailed",
    "Choose a valid time.": "errChooseValidTime",
    "Could not load times.": "errLoadTimes",
    "Could not move this visit.": "moveFail",
} as const satisfies Record<string, keyof Copy>;

export function shownMessage(copy: Copy, message?: string) {
    if (!message) return undefined;
    const key = known[message as keyof typeof known];
    return key ? copy[key] : message;
}
