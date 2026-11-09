import type { PrismaClient, Species } from "../../../generated/prisma/client";
import { nextVaccineDue } from "./vaccines";

type ReminderDb = Pick<PrismaClient, "vaccination" | "careReminder">;

// Keeps one open vaccination reminder for the latest recorded dose. Deworming and flea dates are entered by the vet, not guessed.
export async function syncVaccineReminder(db: ReminderDb, petId: string, species: Species) {
    const doses = await db.vaccination.findMany({
        where: { petId, administeredAt: { not: null } },
        orderBy: { administeredAt: "desc" },
    });
    const latest = doses[0];
    const open = await db.careReminder.findFirst({
        where: { petId, kind: "VACCINATION", completedAt: null },
    });

    if (!latest?.administeredAt) {
        if (open && !open.overridden) await db.careReminder.delete({ where: { id: open.id } });
        return;
    }

    const next = nextVaccineDue(species, latest.type, latest.administeredAt);
    if (!next) {
        if (open && !open.overridden) await db.careReminder.delete({ where: { id: open.id } });
        return;
    }

    if (open?.overridden && open.vaccinationId === latest.id) return;
    if (open) await db.careReminder.delete({ where: { id: open.id } });

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
