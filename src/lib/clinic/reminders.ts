import type { PrismaClient, ReminderType, Species, VaccinationType } from "../../../generated/prisma/client";
import { dateOnlyUtc, formatDateOnly, nextVaccineDue } from "./vaccines";

type ReminderDb = Pick<PrismaClient, "vaccination" | "careReminder">;

// Keeps one open vaccination reminder for the latest recorded dose.
// A date the vet saved or cleared is left alone. Deworming and flea dates are entered by the vet, not guessed.
export async function syncVaccineReminder(db: ReminderDb, petId: string, species: Species) {
    const doses = await db.vaccination.findMany({
        where: { petId, administeredAt: { not: null } },
        orderBy: [{ administeredAt: "desc" }, { id: "desc" }],
        select: { id: true, type: true, administeredAt: true, followUpCleared: true },
    });
    const latest = doses[0];
    const open = await db.careReminder.findFirst({
        where: { petId, kind: "VACCINATION", completedAt: null },
    });

    if (!latest?.administeredAt || latest.followUpCleared || open?.vaccinationId === latest.id) return;

    const annualsBefore = doses.filter((dose) => dose.type === "ANNUAL" && dose.id !== latest.id).length;
    const next = nextVaccineDue(species, latest.type, latest.administeredAt, annualsBefore);
    if (!next) {
        if (open) await db.careReminder.update({ where: { id: open.id }, data: { completedAt: latest.administeredAt } });
        return;
    }

    if (open) await db.careReminder.update({ where: { id: open.id }, data: { completedAt: latest.administeredAt } });
    await db.careReminder.create({
        data: {
            petId,
            kind: "VACCINATION",
            dueAt: next.dueAt,
            dose: next.dose,
            vaccinationId: latest.id,
        },
    });
}

type SavedDose = { id: string; type: string; administeredAt: Date | null };
type SubmittedDose = { type: string; administeredAt?: string };

function dateKey(date: Date | null) {
    if (!date) return "";
    return formatDateOnly(date);
}

function latestSubmitted(rows: SubmittedDose[]) {
    let best: SubmittedDose | null = null;
    let bestIndex = -1;
    rows.forEach((row, index) => {
        if (!row.administeredAt) return;
        if (!best?.administeredAt || row.administeredAt > best.administeredAt || (row.administeredAt === best.administeredAt && index > bestIndex)) {
            best = row;
            bestIndex = index;
        }
    });
    return best;
}

function matchSaved<T extends SavedDose>(saved: T[], submitted: SubmittedDose | null) {
    if (!submitted?.administeredAt) return null;
    return saved.find((row) => row.type === submitted.type && dateKey(row.administeredAt) === submitted.administeredAt) ?? null;
}

// One open reminder follows the latest dose. Earlier doses do not keep their own due dates.
export async function applyRecordedFollowUps(
    db: PrismaClient,
    petId: string,
    species: Species,
    vaccinations: SubmittedDose[],
    treatments: SubmittedDose[],
    followUps: { vaccine?: string; deworming?: string; flea?: string },
) {
    const [savedVaccinations, savedTreatments] = await Promise.all([
        db.vaccination.findMany({ where: { petId }, select: { id: true, type: true, administeredAt: true } }),
        db.treatment.findMany({ where: { petId }, select: { id: true, type: true, administeredAt: true } }),
    ]);
    await db.vaccination.updateMany({ where: { petId }, data: { followUpCleared: true } });
    await db.treatment.updateMany({ where: { petId }, data: { followUpCleared: true } });

    const latestVaccine = matchSaved(savedVaccinations, latestSubmitted(vaccinations));
    if (!latestVaccine?.administeredAt) {
        const due = followUps.vaccine ? dateOnlyUtc(followUps.vaccine) : null;
        await setStandaloneFollowUp(db, {
            petId,
            kind: "VACCINATION",
            due,
            dose: due ? upcomingVaccineDose(species, vaccinations) : null,
        });
    } else {
        const due = followUps.vaccine ? dateOnlyUtc(followUps.vaccine) : null;
        if (due) await db.vaccination.update({ where: { id: latestVaccine.id }, data: { followUpCleared: false } });
        const annualsBefore = savedVaccinations.filter((row) => row.type === "ANNUAL" && row.id !== latestVaccine.id && row.administeredAt).length;
        const suggested = nextVaccineDue(species, latestVaccine.type as VaccinationType, latestVaccine.administeredAt, annualsBefore);
        await setOpenFollowUp(db, {
            petId,
            kind: "VACCINATION",
            recordId: latestVaccine.id,
            field: "vaccinationId",
            due,
            dose: suggested?.dose ?? latestVaccine.type,
            overridden: Boolean(due && suggested && formatDateOnly(suggested.dueAt) !== followUps.vaccine),
            givenAt: latestVaccine.administeredAt,
        });
    }

    const treatmentDue = { DEWORMING: followUps.deworming, FLEA_TICK: followUps.flea } as const;
    for (const type of ["DEWORMING", "FLEA_TICK"] as const) {
        const latest = matchSaved(savedTreatments, latestSubmitted(treatments.filter((row) => row.type === type)));
        if (!latest?.administeredAt) {
            const dueValue = treatmentDue[type];
            await setStandaloneFollowUp(db, {
                petId,
                kind: type === "DEWORMING" ? "DEWORMING" : "FLEA_TREATMENT",
                due: dueValue ? dateOnlyUtc(dueValue) : null,
                dose: type,
            });
            continue;
        }
        const dueValue = treatmentDue[type];
        const due = dueValue ? dateOnlyUtc(dueValue) : null;
        if (due) await db.treatment.update({ where: { id: latest.id }, data: { followUpCleared: false } });
        await setOpenFollowUp(db, {
            petId,
            kind: type === "DEWORMING" ? "DEWORMING" : "FLEA_TREATMENT",
            recordId: latest.id,
            field: "treatmentId",
            due,
            dose: type,
            overridden: true,
            givenAt: latest.administeredAt,
        });
    }
}

function upcomingVaccineDose(species: Species, vaccinations: SubmittedDose[]) {
    const dated = latestSubmitted(vaccinations);
    const anchor = dated ?? vaccinations.filter((row) => row.type).at(-1) ?? null;
    if (!anchor?.type) return null;
    const annualsBefore = vaccinations.filter((row) => row !== anchor && row.type === "ANNUAL" && row.administeredAt).length;
    const when = anchor.administeredAt ? dateOnlyUtc(anchor.administeredAt) : dateOnlyUtc("2000-01-01");
    if (!when) return null;
    return nextVaccineDue(species, anchor.type as VaccinationType, when, anchor.type === "ANNUAL" ? annualsBefore : 0)?.dose ?? null;
}

async function setStandaloneFollowUp(
    db: PrismaClient,
    input: { petId: string; kind: ReminderType; due: Date | null; dose: string | null },
) {
    const open = await db.careReminder.findFirst({
        where: { petId: input.petId, kind: input.kind, completedAt: null },
        select: { id: true },
    });
    if (!input.due) {
        if (open) await db.careReminder.delete({ where: { id: open.id } });
        return;
    }
    const data = {
        dueAt: input.due,
        dose: input.dose,
        overridden: true,
        completedAt: null,
        vaccinationId: null,
        treatmentId: null,
    };
    if (open) {
        await db.careReminder.update({ where: { id: open.id }, data });
        return;
    }
    await db.careReminder.create({
        data: { petId: input.petId, kind: input.kind, ...data },
    });
}

async function setOpenFollowUp(
    db: PrismaClient,
    input: {
        petId: string;
        kind: ReminderType;
        recordId: string;
        field: "vaccinationId" | "treatmentId";
        due: Date | null;
        dose: string;
        overridden: boolean;
        givenAt: Date;
    },
) {
    const linked = await db.careReminder.findFirst({
        where: { [input.field]: input.recordId },
        select: { id: true },
    });
    const open = await db.careReminder.findFirst({
        where: { petId: input.petId, kind: input.kind, completedAt: null },
        select: { id: true, vaccinationId: true, treatmentId: true },
    });
    const openRecordId = input.field === "vaccinationId" ? open?.vaccinationId : open?.treatmentId;

    if (!input.due) {
        if (open && openRecordId === input.recordId) await db.careReminder.delete({ where: { id: open.id } });
        else if (open) await db.careReminder.update({ where: { id: open.id }, data: { completedAt: input.givenAt } });
        return;
    }

    if (open && open.id !== linked?.id) {
        await db.careReminder.update({ where: { id: open.id }, data: { completedAt: input.givenAt } });
    }
    if (linked) {
        await db.careReminder.update({
            where: { id: linked.id },
            data: { dueAt: input.due, dose: input.dose, overridden: input.overridden, completedAt: null },
        });
        return;
    }
    await db.careReminder.create({
        data: {
            petId: input.petId,
            kind: input.kind,
            dueAt: input.due,
            dose: input.dose,
            overridden: input.overridden,
            [input.field]: input.recordId,
        },
    });
}
