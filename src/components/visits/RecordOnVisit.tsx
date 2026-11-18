"use client";

import { useState } from "react";
import { TreatmentForm, VaccineForm } from "@/components/pets/pet-profile/tabs/CareRecordForm";
import type { Copy } from "@/lib/i18n";

export default function RecordOnVisit({
    petId,
    species,
    annualsBefore,
    doses,
    visitId,
    copy,
}: {
    petId: string;
    species: "CAT" | "DOG";
    annualsBefore: number;
    doses: ("FIRST" | "SECOND" | "THIRD" | "ANNUAL")[];
    visitId: string;
    copy: Copy;
}) {
    const [open, setOpen] = useState<"vaccine" | "treatment" | null>(null);

    return (
        <section className="mt-8">
            <h2 className="text-sm font-semibold text-emerald-950 dark:text-emerald-50">{copy.visitRecordDose}</h2>
            <div className="mt-3 flex flex-wrap gap-2">
                {doses.length > 0 && open !== "vaccine" && (
                    <button type="button" onClick={() => setOpen("vaccine")} className="rounded-full bg-emerald-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-950">
                        {copy.addVaccination}
                    </button>
                )}
                {open !== "treatment" && (
                    <button type="button" onClick={() => setOpen("treatment")} className="rounded-full border border-emerald-900 px-3 py-1.5 text-sm font-medium text-emerald-900 hover:bg-emerald-50 dark:border-emerald-300 dark:text-emerald-100 dark:hover:bg-emerald-950">
                        {copy.addTreatment}
                    </button>
                )}
            </div>
            {open === "vaccine" && (
                <VaccineForm petId={petId} species={species} annualsBefore={annualsBefore} doses={doses} medicalVisitId={visitId} copy={copy} onClose={() => setOpen(null)} />
            )}
            {open === "treatment" && (
                <TreatmentForm petId={petId} medicalVisitId={visitId} copy={copy} onClose={() => setOpen(null)} />
            )}
        </section>
    );
}
