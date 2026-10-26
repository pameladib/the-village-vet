"use server";

import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";
import { PetForm, petSchema } from "../validations/pet";
import { requireRole } from "../auth/session";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const photoExtensions: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
};

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

async function savePetPhoto(photo: File) {
    const extension = photoExtensions[photo.type];
    if (!extension) {
        throw new Error("Unsupported image");
    }

    const filename = `${crypto.randomUUID()}.${extension}`;
    const directory = path.join(process.cwd(), "public", "pet-photos");
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, filename), Buffer.from(await photo.arrayBuffer()));
    return `/pet-photos/${filename}`;
}

async function removeStoredPhoto(photoUrl: string | null) {
    if (!photoUrl?.startsWith("/pet-photos/")) return;
    const filename = path.basename(photoUrl);
    if (filename !== photoUrl.slice("/pet-photos/".length)) return;
    await unlink(path.join(process.cwd(), "public", "pet-photos", filename)).catch(() => undefined);
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

                ownerId: session.user.id,

                vaccinations: {
                    create: result.data.vaccinations.map((vaccination) => ({
                        type: vaccination.type,
                        administeredAt: vaccination.administeredAt
                            ? new Date(vaccination.administeredAt)
                            : null,
                    }))
                },

                treatments: {
                    create: result.data.treatments.map((treatment) => ({
                        type: treatment.type,
                        administeredAt: treatment.administeredAt ? new Date(treatment.administeredAt) : null,
                    }))
                },

                ...(weightGrams != null
                    ? { weightRecords: { create: { weightGrams } } }
                    : {}),
            },
        });

        let photoUrl: string | null = null;
        if (result.data.photo) {
            photoUrl = await savePetPhoto(result.data.photo);
            await prisma.pet.update({
                where: { id: created.id },
                data: { photoUrl },
            });
        }

        return { success: true, id: created.id };
    } catch {
        return { success: false, formErrors: ["Could not save this pet."] };  
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
        result.data.currentWeight != null
        && result.data.weightUnit
            ? result.data.weightUnit === "KG"
                ? Math.round(result.data.currentWeight * 1000)
                : Math.round(result.data.currentWeight)
            : null;

    const existing = await prisma.pet.findUnique({
        where: { id, ownerId: session.user.id },
        select: {
            photoUrl: true,
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

    const estimatedAge = result.data.estimatedAge ?? null;
    const estimatedAgeUnit = estimatedAge != null ? result.data.estimatedAgeUnit ?? null : null;
    const previousAge = existing.estimatedAgeValue?.toNumber() ?? null;
    const ageChanged = estimatedAge !== previousAge || estimatedAgeUnit !== existing.estimatedAgeUnit;
    const estimatedAgeAt = estimatedAge == null ? null : ageChanged ? new Date() : existing.estimatedAgeAt;

    const vaccinations = splitKeptAndNew(existing.vaccinations, result.data.vaccinations);
    const treatments = splitKeptAndNew(existing.treatments, result.data.treatments);
    let newPhotoUrl: string | null = null;

    try {
        if (result.data.photo) {
            newPhotoUrl = await savePetPhoto(result.data.photo);
        }

        await prisma.$transaction(async (tx) => {
            const updated = await tx.pet.updateMany({
                where: { id, ownerId: session.user.id },
                data: {
                    name: result.data.name,
                    species: result.data.species,
                    sex: result.data.sex,
                    color: result.data.color || null,
                    breed: result.data.breed || null,
                    dateOfBirth: result.data.dateOfBirth ? new Date(result.data.dateOfBirth) : null,
                    estimatedAgeValue: estimatedAge,
                    estimatedAgeUnit,
                    estimatedAgeAt,
                    lifestyle: result.data.lifestyle || null,
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
                    ...(newPhotoUrl
                        ? { photoUrl: newPhotoUrl }
                        : result.data.removePhoto
                            ? { photoUrl: null }
                            : {}),
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
                await tx.healthReminder.deleteMany({
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
                    })),
                });
            }

            if (treatments.toCreate.length > 0) {
                await tx.treatment.createMany({
                    data: treatments.toCreate.map((treatment) => ({
                        petId: id,
                        type: treatment.type as "DEWORMING" | "FLEA_TICK",
                        administeredAt: treatment.administeredAt,
                    })),
                });
            }

            const latestWeight = existing.weightRecords[0]?.weightGrams;
            if (
                weightGrams != null &&
                (latestWeight == null || weightGrams !== gramsShownInForm(latestWeight))
            ) {
                await tx.weightRecord.create({
                    data: { petId: id, weightGrams },
                });
            }
        });

        if (newPhotoUrl || result.data.removePhoto) {
            await removeStoredPhoto(existing.photoUrl);
        }

        return { success: true, id };
    } catch {
        if (newPhotoUrl) await removeStoredPhoto(newPhotoUrl);
        return { success: false, formErrors: ["Could not save this pet."] };
    }
}