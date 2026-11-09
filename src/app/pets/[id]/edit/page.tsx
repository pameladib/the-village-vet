import NewPetForm from "@/components/pets/new/NewPetForm";
import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import type { PetForm } from "@/lib/validations/pet";
import { notFound, redirect } from "next/navigation";

function toDateInput(date: Date | null) {
    if (!date) return "";
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function textValue(value: string | null) { // this function will be used for optional text fields like breed to convert null to empty string (when the value is unavailable/unprovided, it's stored as null in the database but the form expects an empty string "" so we must convert it)
    return value ?? ""; // ?? is the nullish coalescing operator; it returns "" (empty string) if value is null, and if it's not it returns value itself
}

function toFormWeight(grams: number | null): Pick<PetForm, "currentWeight" | "weightUnit"> {
    if (grams == null) return {};
    if (grams < 1000) return { currentWeight: grams, weightUnit: "GRAMS" };

    const kilograms = grams / 1000;
    return {
        currentWeight: Number.isInteger(kilograms) ? kilograms : Number(kilograms.toFixed(1)),
        weightUnit: "KG",
    };
}

export default async function EditPetPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    let session;
    try {
        session = await requireRole(["OWNER", "ADMIN"]);
    } catch (error) {
        if (
            error instanceof Error &&
            (error.message === "User is not authenticated" ||
                error.message === "User does not have the required role")
        ) {
            redirect("/");
        }
        throw error;
    }

    const pet = await prisma.pet.findFirst({
        where: session.user.role === "ADMIN" ? { id } : { id, ownerId: session.user.id },
        include: {
            weightRecords: { // current weight is the latest weight record, not a column on the pet
                orderBy: { recordedAt: "desc" },
                take: 1,
                select: { weightGrams: true },
            },
            vaccinations: { select: { type: true, administeredAt: true } },
            treatments: { select: { type: true, administeredAt: true } },
        },
    });

    if (!pet) notFound();

    // we must convert the pet's existing data that we got from the database into the format the form expects so we can have the values filled in in the edit form

    const { weightRecords, estimatedAgeValue, vaccinations, treatments, photoUrl, ...petFields } = pet; // spreading the pet object to separate the properties that need special handling, and pack the rest of the properties into petFields

    const defaultValues: PetForm = { // defaultValues is the object containing the initial values of our form; it must match the structure of the form
        name: petFields.name, // required field (cannot be null) so we can pass it as is
        species: petFields.species,
        sex: petFields.sex,
        breed: textValue(petFields.breed), // converting null to "" if breed is not provided
        color: textValue(petFields.color), // converting null to "" if color is not provided
        dateOfBirth: toDateInput(petFields.dateOfBirth),
        estimatedAge: estimatedAgeValue?.toNumber(), // Decimal must be converted to number
        estimatedAgeUnit: petFields.estimatedAgeUnit ?? undefined,
        lifestyle: petFields.lifestyle ?? undefined,
        ...toFormWeight(weightRecords[0]?.weightGrams ?? null),
        spayedNeutered: petFields.spayedNeutered,
        spayedNeuteredAt: toDateInput(petFields.spayedNeuteredAt),
        vaccinations: vaccinations.map((vaccination) => ({
            type: vaccination.type,
            administeredAt: toDateInput(vaccination.administeredAt),
        })),
        treatments: treatments.map((treatment) => ({
            type: treatment.type,
            administeredAt: toDateInput(treatment.administeredAt),
        })),
        allergies: textValue(petFields.allergies),
        medicalConditions: textValue(petFields.medicalConditions),
        medications: textValue(petFields.medications),
        diet: textValue(petFields.diet),
        previousHistory: textValue(petFields.previousHistory),
    };

    return <NewPetForm defaultValues={defaultValues} photoUrl={photoUrl} id={petFields.id} allowClinical />;
}