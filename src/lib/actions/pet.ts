"use server";

import { PetForm, petSchema } from "../validations/pet";
import { requireRole } from "../auth/session";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { applyRecordedFollowUps, syncVaccineReminder } from "@/lib/clinic/reminders";
import { canChangePetPhoto } from "@/lib/auth/permissions";
import { PET_PHOTOS_BUCKET, isSafeObjectKey } from "@/lib/storage/files";
import { removeStoredObject } from "@/lib/storage/supabase";

async function discardPhoto(photoUrl: string | null) {
    if (!photoUrl || !isSafeObjectKey(photoUrl)) return;
    await removeStoredObject(PET_PHOTOS_BUCKET, photoUrl);
}

function saveError() {
    return "Could not save this pet.";
}

function latestAdministration(rows: { administeredAt?: string }[]) {
    return rows.reduce<string | undefined>((latest, row) => {
        if (!row.administeredAt) return latest;
        if (!latest || row.administeredAt > latest) return row.administeredAt;
        return latest;
    }, undefined);
}

function followUpError(
    species: string,
    vaccinations: { type: string; administeredAt?: string }[],
    treatments: { type: string; administeredAt?: string }[],
    followUps: { vaccine?: string; deworming?: string; flea?: string },
) {
    if (species === "CAT" && vaccinations.some((dose) => dose.type === "THIRD")) return "Cats do not have a third vaccine dose.";
    const checks = [
        [latestAdministration(vaccinations), followUps.vaccine],
        [latestAdministration(treatments.filter((row) => row.type === "DEWORMING")), followUps.deworming],
        [latestAdministration(treatments.filter((row) => row.type === "FLEA_TICK")), followUps.flea],
    ];
    if (checks.some(([given, due]) => given && due && due < given)) return "The next due date cannot be before the dose was given.";
    return null;
}

function doseDateKey(date: Date | null) {
    if (!date) return "";
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

// The form shows kilograms to one decimal. Compare against that shown value so an unchanged save does not store a rounded weight.
function gramsShownInForm(grams: number) {
    if (grams < 1000) return grams;
    const kilograms = grams / 1000;
    const shown = Number.isInteger(kilograms) ? kilograms : Number(kilograms.toFixed(1));
    return Math.round(shown * 1000);
}

function splitKeptAndNew<T extends { id: string; type: string; administeredAt: Date | null }>(
    existing: T[],
    submitted: { type: string; administeredAt?: string }[],
) {
    const used = new Set<string>();
    const toCreate: { type: string; administeredAt: Date | null }[] = [];

    for (const item of submitted) {
        const submittedDate = item.administeredAt ?? "";
        const match = existing.find(
            (row) => !used.has(row.id) && row.type === item.type && doseDateKey(row.administeredAt) === submittedDate,
        );
        if (match) {
            used.add(match.id);
        } else {
            toCreate.push({
                type: item.type,
                administeredAt: item.administeredAt ? new Date(item.administeredAt) : null,
            });
        }
    }

    return {
        removedIds: existing.filter((row) => !used.has(row.id)).map((row) => row.id),
        toCreate,
    };
}

export async function createPet(data: PetForm) {
    let session;
    try {
        session = await requireRole(["ADMIN", "OWNER"]);
    } catch (error) {
        if (
            error instanceof Error &&
            (error.message === "User is not authenticated" ||
                error.message === "User does not have the required role")
        ) {
            return { success: false, formErrors: ["You need to sign in."] };
        }
        return { success: false, formErrors: ["Could not save this pet."] };
    }


    const result = petSchema.safeParse(data);
    if (!result.success) {
        return {
            success: false,
            errors: z.flattenError(result.error).fieldErrors,
            formErrors: z.flattenError(result.error).formErrors,
        };
    }

    const weightGrams =
        result.data.currentWeight != null // explicitly check for null otherwise 0 will be treated as falsy as well although it's a valid value for weight. we use loose inequality (!= not !==) to also check for undefined
        && result.data.weightUnit // checks if a unit was selected 
            ? result.data.weightUnit === "KG" // if both above checks pass, calculate weightGrams
                ? Math.round(result.data.currentWeight * 1000) // if unit selected is KG must convert to grams
                : Math.round(result.data.currentWeight) // else
            : null; // else return null

    const followUp = followUpError(result.data.species, result.data.vaccinations, result.data.treatments, {
        vaccine: result.data.vaccineNextDueAt,
        deworming: result.data.dewormingNextDueAt,
        flea: result.data.fleaNextDueAt,
    });
    if (followUp) return { success: false, formErrors: [followUp] };

    try {
        const created = await prisma.pet.create({
            data: {
                name: result.data.name,
                species: result.data.species,
                sex: result.data.sex,
                color: result.data.color || null,
                breed: result.data.breed || null,
                dateOfBirth: result.data.dateOfBirth ? new Date(result.data.dateOfBirth) : null,
                estimatedAgeValue: result.data.estimatedAge ?? null,
                estimatedAgeUnit: result.data.estimatedAge != null ? result.data.estimatedAgeUnit ?? null : null,
                estimatedAgeAt: result.data.estimatedAge != null ? new Date() : null,
                lifestyle: result.data.lifestyle || null,
                ownerId: session.user.id,
                spayedNeutered: result.data.spayedNeutered ?? null,
                spayedNeuteredAt:
                    result.data.spayedNeutered === "YES" && result.data.spayedNeuteredAt
                        ? new Date(result.data.spayedNeuteredAt)
                        : null,
                allergies: result.data.allergies || null,
                medicalConditions: result.data.medicalConditions || null,
                medications: result.data.medications || null,
                diet: result.data.diet || null,
                previousHistory: result.data.previousHistory || null,
                vaccinations: {
                    create: result.data.vaccinations.map((vaccination) => ({
                        type: vaccination.type,
                        administeredAt: vaccination.administeredAt ? new Date(vaccination.administeredAt) : null,
                        followUpCleared: true,
                    })),
                },
                treatments: {
                    create: result.data.treatments.map((treatment) => ({
                        type: treatment.type,
                        administeredAt: treatment.administeredAt ? new Date(treatment.administeredAt) : null,
                        followUpCleared: true,
                    })),
                },
                ...(weightGrams != null ? { weightRecords: { create: { weightGrams } } } : {}),
            },
        });

        await applyRecordedFollowUps(prisma, created.id, result.data.species, result.data.vaccinations, result.data.treatments, {
            vaccine: result.data.vaccineNextDueAt,
            deworming: result.data.dewormingNextDueAt,
            flea: result.data.fleaNextDueAt,
        });
        await syncVaccineReminder(prisma, created.id, result.data.species);

        return { success: true, id: created.id };
    } catch {
        return { success: false, formErrors: [saveError()] };
    }

}

/* 
PetForm describes the data our form collects
Pet model in schema.prisma describes how pet information is stored in our database
since they don't have identical structures, we cannot pass result.data directly 
must apply the necessary conversions before storing the data */

/* 
createPet() returns success: false in three cases:
1. user is not signed in or signed it but doesn't have the required role
2. the server-side Zod check fails
3. the database insert fails

it returns success: true only if the pet row is inserted
*/

export async function updatePet(id: string, data: PetForm) {
    let session: Awaited<ReturnType<typeof requireRole>>;
    try {
        session = await requireRole(["ADMIN", "OWNER"]);
    } catch (error) {
        if (
            error instanceof Error &&
            (error.message === "User is not authenticated" ||
                error.message === "User does not have the required role")
        ) {
            return { success: false, formErrors: ["You need to sign in."] };
        }
        return { success: false, formErrors: ["Could not save this pet."] };
    }

    const result = petSchema.safeParse(data);
    if (!result.success) {
        return {
            success: false,
            errors: z.flattenError(result.error).fieldErrors,
            formErrors: z.flattenError(result.error).formErrors,
        };
    }

    const weightGrams =
        result.data.currentWeight != null
        && result.data.weightUnit
            ? result.data.weightUnit === "KG"
                ? Math.round(result.data.currentWeight * 1000)
                : Math.round(result.data.currentWeight)
            : null;

    const isAdmin = session.user.role === "ADMIN";
    const existing = await prisma.pet.findFirst({
        where: isAdmin ? { id } : { id, ownerId: session.user.id },
        select: {
            photoUrl: true,
            species: true,
            estimatedAgeValue: true,
            estimatedAgeUnit: true,
            estimatedAgeAt: true,
            weightRecords: {
                orderBy: { recordedAt: "desc" },
                take: 1,
                select: { weightGrams: true },
            },
            vaccinations: { select: { id: true, type: true, administeredAt: true } },
            treatments: { select: { id: true, type: true, administeredAt: true } },
        },
    });

    if (!existing) {
        return { success: false, formErrors: ["We couldn't find this pet."] };
    }
    const currentPet = existing;
    const form = result.data;

    const estimatedAge = result.data.estimatedAge ?? null;
    const estimatedAgeUnit = estimatedAge != null ? result.data.estimatedAgeUnit ?? null : null;
    const previousAge = existing.estimatedAgeValue?.toNumber() ?? null;
    const ageChanged = estimatedAge !== previousAge || estimatedAgeUnit !== existing.estimatedAgeUnit;
    const estimatedAgeAt = estimatedAge == null ? null : ageChanged ? new Date() : existing.estimatedAgeAt;

    const followUp = followUpError(result.data.species, result.data.vaccinations, result.data.treatments, {
        vaccine: result.data.vaccineNextDueAt,
        deworming: result.data.dewormingNextDueAt,
        flea: result.data.fleaNextDueAt,
    });
    if (followUp) return { success: false, formErrors: [followUp] };

    const vaccinations = splitKeptAndNew(existing.vaccinations, result.data.vaccinations);
    const treatments = splitKeptAndNew(existing.treatments, result.data.treatments);
    if (result.data.removePhoto && !canChangePetPhoto(session.user.role)) {
        return { success: false, formErrors: ["You cannot change this photo."] };
    }

    async function savePet(photoUrl: string | null | undefined) {
        await prisma.$transaction(async (tx) => {
            const updated = await tx.pet.updateMany({
                where: isAdmin ? { id } : { id, ownerId: session.user.id },
                data: {
                    name: form.name,
                    species: form.species,
                    sex: form.sex,
                    color: form.color || null,
                    breed: form.breed || null,
                    lifestyle: form.lifestyle || null,
                    spayedNeutered: form.spayedNeutered ?? null,
                    spayedNeuteredAt:
                        form.spayedNeutered === "YES" && form.spayedNeuteredAt
                            ? new Date(form.spayedNeuteredAt)
                            : null,
                    allergies: form.allergies || null,
                    medicalConditions: form.medicalConditions || null,
                    medications: form.medications || null,
                    diet: form.diet || null,
                    previousHistory: form.previousHistory || null,
                    dateOfBirth: form.dateOfBirth ? new Date(form.dateOfBirth) : null,
                    estimatedAgeValue: estimatedAge,
                    estimatedAgeUnit,
                    estimatedAgeAt,
                    ...(photoUrl !== undefined ? { photoUrl } : {}),
                },
            });

            if (updated.count !== 1) {
                throw new Error("Pet not found");
            }

            const reminderFilters = [
                ...(vaccinations.removedIds.length > 0 ? [{ vaccinationId: { in: vaccinations.removedIds } }] : []),
                ...(treatments.removedIds.length > 0 ? [{ treatmentId: { in: treatments.removedIds } }] : []),
            ];
            if (reminderFilters.length > 0) {
                await tx.careReminder.deleteMany({
                    where: { petId: id, OR: reminderFilters },
                });
            }

            if (vaccinations.removedIds.length > 0) {
                await tx.vaccination.deleteMany({ where: { id: { in: vaccinations.removedIds } } });
            }
            if (treatments.removedIds.length > 0) {
                await tx.treatment.deleteMany({ where: { id: { in: treatments.removedIds } } });
            }

            if (vaccinations.toCreate.length > 0) {
                await tx.vaccination.createMany({
                    data: vaccinations.toCreate.map((vaccination) => ({
                        petId: id,
                        type: vaccination.type as "FIRST" | "SECOND" | "THIRD" | "ANNUAL",
                        administeredAt: vaccination.administeredAt,
                        followUpCleared: true,
                    })),
                });
            }

            if (treatments.toCreate.length > 0) {
                await tx.treatment.createMany({
                    data: treatments.toCreate.map((treatment) => ({
                        petId: id,
                        type: treatment.type as "DEWORMING" | "FLEA_TICK",
                        administeredAt: treatment.administeredAt,
                        followUpCleared: true,
                    })),
                });
            }

            const latestWeight = currentPet.weightRecords[0]?.weightGrams;
            if (
                weightGrams != null &&
                (latestWeight == null || weightGrams !== gramsShownInForm(latestWeight))
            ) {
                await tx.weightRecord.create({
                    data: { petId: id, weightGrams },
                });
            }
        });
    }

    try {
        await savePet(result.data.removePhoto ? null : undefined);
        if (result.data.removePhoto) await discardPhoto(existing.photoUrl).catch(() => undefined);
        // The pet is already saved. A failed reminder must not undo that save. The next save rebuilds it.
        await applyRecordedFollowUps(prisma, id, form.species, result.data.vaccinations, result.data.treatments, {
            vaccine: result.data.vaccineNextDueAt,
            deworming: result.data.dewormingNextDueAt,
            flea: result.data.fleaNextDueAt,
        }).catch(() => undefined);
        await syncVaccineReminder(prisma, id, form.species).catch(() => undefined);

        return { success: true, id };
    } catch {
        return { success: false, formErrors: [saveError()] };
    }
}
