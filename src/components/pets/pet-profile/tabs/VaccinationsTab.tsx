import type { PetProfileData, ProfileTreatment, ProfileVaccination } from "../PetProfile";

const vaccinationLabels: Record<ProfileVaccination["type"], string> = {
    FIRST: "First",
    SECOND: "Second",
    THIRD: "Third",
    ANNUAL: "Annual",
};

const treatmentLabels: Record<ProfileTreatment["type"], string> = {
    DEWORMING: "Deworming",
    FLEA_TICK: "Flea & tick",
};

function givenTime(value: Date | string | null) {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    const time = date.getTime();
    return Number.isNaN(time) ? null : time;
}

function byNewestGivenDate<T extends { administeredAt: Date | null }>(left: T, right: T) {
    const leftTime = givenTime(left.administeredAt);
    const rightTime = givenTime(right.administeredAt);
    if (leftTime == null && rightTime == null) return 0;
    if (leftTime == null) return 1; // undated rows go last
    if (rightTime == null) return -1;
    return rightTime - leftTime;
}

function formatGivenDate(value: Date | string | null) {
    const time = givenTime(value);
    if (time == null) return null;
    return new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
    }).format(new Date(time));
}

function RecordTable({ rows }: { rows: { id: string; type: string; administeredAt: Date | null }[] }) {
    return (
        <div className="overflow-hidden rounded-2xl bg-stone-100 dark:bg-stone-900">
            <table className="w-full text-left">
                <thead>
                    <tr className="text-sm text-stone-500 dark:text-stone-400">
                        <th scope="col" className="px-3.5 py-3 font-medium">Type</th>
                        <th scope="col" className="px-3.5 py-3 font-medium">Date</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row) => {
                        const date = formatGivenDate(row.administeredAt);
                        return (
                            <tr key={row.id} className="border-t border-stone-200/80 dark:border-stone-800">
                                <td className="px-3.5 py-3 text-sm font-medium text-stone-900 dark:text-stone-50">{row.type}</td>
                                <td className={date ? "px-3.5 py-3 text-sm text-stone-900 dark:text-stone-50" : "px-3.5 py-3 text-sm text-stone-400 dark:text-stone-500"}>
                                    {date ?? "Not provided"}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

function EmptyRecord({ children }: { children: string }) {
    return (
        <p className="rounded-2xl bg-stone-100 px-3.5 py-3.5 text-sm text-stone-400 dark:bg-stone-900 dark:text-stone-500">
            {children}
        </p>
    );
}

export default function VaccinationsTab({ pet }: { pet: PetProfileData }) {
    const vaccinations = [...pet.vaccinations]
        .sort(byNewestGivenDate)
        .map((vaccination) => ({ ...vaccination, type: vaccinationLabels[vaccination.type] }));
    const treatments = [...pet.treatments]
        .sort(byNewestGivenDate)
        .map((treatment) => ({ ...treatment, type: treatmentLabels[treatment.type] }));

    return (
        <div className="flex flex-col gap-6">
            <section>
                <h3 className="mb-2 text-sm font-medium text-emerald-900 dark:text-emerald-200">Vaccines</h3>
                {vaccinations.length === 0 ? <EmptyRecord>No vaccines yet</EmptyRecord> : <RecordTable rows={vaccinations} />}
            </section>
            <section>
                <h3 className="mb-2 text-sm font-medium text-emerald-900 dark:text-emerald-200">Treatments</h3>
                {treatments.length === 0 ? <EmptyRecord>No treatments yet</EmptyRecord> : <RecordTable rows={treatments} />}
            </section>
        </div>
    );
}
