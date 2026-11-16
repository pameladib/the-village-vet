"use client";

import { useEffect, useRef } from "react";
import { useFormContext, useWatch, useFieldArray } from "react-hook-form";
import { formatTodayDate } from "@/lib/helpers/dates";
import { addCalendarMonths, dateOnlyUtc, formatDateOnly, nextVaccineDue } from "@/lib/clinic/vaccines";
import type { PetForm } from "@/lib/validations/pet";
const catVaccinationTypes = ["FIRST", "SECOND", "ANNUAL"] as const;
const dogVaccinationTypes = ["FIRST", "SECOND", "THIRD", "ANNUAL"] as const;

const vaccinationLabels = {
  FIRST: "First dose",
  SECOND: "Second dose",
  THIRD: "Third dose",
  ANNUAL: "Annual dose",
} as const;

const treatmentIntervals = [
  { months: 1, label: "1 month" },
  { months: 2, label: "2 months" },
  { months: 3, label: "3 months" },
  { months: 6, label: "6 months" },
] as const;


function getAvailableVaccinationOptions(
  species: "CAT" | "DOG" | undefined,
  vaccinations: { type?: string }[] | undefined, // this function only cares about the type of vaccination, so we can ignore the administeredAt property. The type is optional because the user may not have selected a type yet.
  rowIndex: number,
) {
  const options = species === "DOG" ? dogVaccinationTypes : catVaccinationTypes;
  const selectedType = vaccinations?.[rowIndex]?.type; // getting the type of the current vaccination row being rendered. Optional chaining is used here because vaccinations may be undefined, and if it is, selectedType will be undefined. If vaccinations is defined but the rowIndex is out of bounds, selectedType will also be undefined.

  return options.filter((type) => {
    if (type === "ANNUAL" || type === selectedType) return true; // Annual vaccinations can be selected multiple times, so we always include it in the available options. We also include the currently selected type for this row since by the time the row is rendered, the current type has already been added to the vaccinations array and we don't want to remove it from the available options for this row.

    return !vaccinations?.some((vaccination) => vaccination.type === type); // for the rest of the types (other than Annual and the currently selected type), we only include them in the available options if they haven't already been selected in another row. This ensures that each type can only be selected once across all rows, except for Annual which can be selected multiple times.
  });
}

const fieldClassName =
  "w-full min-w-0 rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 shadow-sm outline-none transition placeholder:text-stone-400 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-50 dark:focus:border-emerald-400 dark:focus:ring-emerald-400/20";

const labelClassName =
  "mb-1.5 block text-sm font-medium text-stone-800 dark:text-stone-200";

const textareaClassName = `${fieldClassName} min-h-24 resize-y`;

function latestDose<T extends { type?: string; administeredAt?: string }>(rows: T[] | undefined, type?: string): T | null {
  let best: T | null = null;
  let bestIndex = -1;
  for (let index = 0; index < (rows?.length ?? 0); index += 1) {
    const row = rows![index];
    if (type && row.type !== type) continue;
    if (!row.administeredAt) continue;
    if (!best?.administeredAt || row.administeredAt > best.administeredAt || (row.administeredAt === best.administeredAt && index > bestIndex)) {
      best = row;
      bestIndex = index;
    }
  }
  return best;
}

function NextVaccineDue({ species }: { species: "CAT" | "DOG" | undefined }) {
  const { register, setValue, getValues } = useFormContext<PetForm>();
  const vaccinations = useWatch<PetForm, "vaccinations">({ name: "vaccinations" });
  const latest = latestDose(vaccinations);
  const annualsBefore = (vaccinations ?? []).filter((row) => row !== latest && row.type === "ANNUAL" && row.administeredAt).length;
  const key = latest?.administeredAt ? `${species ?? ""}|${latest.type ?? ""}|${latest.administeredAt}|${annualsBefore}` : "";
  const seen = useRef(key);

  useEffect(() => {
    if (!key || !latest?.administeredAt || !species || !latest.type || seen.current === key) return;
    const previous = seen.current;
    seen.current = key;
    if (!previous && getValues("vaccineNextDueAt")) return;
    const given = dateOnlyUtc(latest.administeredAt);
    if (!given) return;
    const next = nextVaccineDue(species, latest.type, given, latest.type === "ANNUAL" ? annualsBefore : 0);
    setValue("vaccineNextDueAt", next ? formatDateOnly(next.dueAt) : "");
  }, [annualsBefore, getValues, key, latest, setValue, species]);

  const threeWeeks = latest?.type === "FIRST" || (species === "DOG" && latest?.type === "SECOND");

  return (
    <div className="mt-3 rounded-lg border border-emerald-100 bg-emerald-50/60 p-3 dark:border-emerald-900 dark:bg-emerald-950/30">
      <label className="block">
        <span className={labelClassName}>Next vaccination due</span>
        <input type="date" className={fieldClassName} {...register("vaccineNextDueAt")} />
      </label>
      <p className="mt-1 text-xs text-stone-500">
        {latest?.administeredAt
          ? `${threeWeeks ? "Suggested 3 weeks after the last dose." : "Suggested 11 months after the last dose."} You can change or clear it.`
          : "Set this even if the administration date is unknown."}
      </p>
      <button type="button" onClick={() => setValue("vaccineNextDueAt", "")} className="mt-1 text-xs font-medium text-stone-500 hover:text-stone-800 dark:hover:text-stone-200">Clear date</button>
    </div>
  );
}

function NextTreatmentDue({
  type,
  name,
  label,
}: {
  type: "DEWORMING" | "FLEA_TICK";
  name: "dewormingNextDueAt" | "fleaNextDueAt";
  label: string;
}) {
  const { register, setValue } = useFormContext<PetForm>();
  const treatments = useWatch<PetForm, "treatments">({ name: "treatments" });
  const latest = latestDose(treatments, type);
  const interval = useRef<number | null>(null);
  const previousDate = useRef<string | null>(null);

  useEffect(() => {
    const givenOn = latest?.administeredAt ?? "";
    if (!givenOn) return;
    if (previousDate.current === null) {
      previousDate.current = givenOn;
      return;
    }
    if (previousDate.current === givenOn || interval.current == null) {
      previousDate.current = givenOn;
      return;
    }
    previousDate.current = givenOn;
    const given = dateOnlyUtc(givenOn);
    if (!given) return;
    setValue(name, formatDateOnly(addCalendarMonths(given, interval.current)));
  }, [latest?.administeredAt, name, setValue]);

  function chooseInterval(months: number) {
    interval.current = months;
    const given = latest?.administeredAt ? dateOnlyUtc(latest.administeredAt) : null;
    if (!given) return;
    setValue(name, formatDateOnly(addCalendarMonths(given, months)));
  }

  return (
    <div className="mt-3 rounded-lg border border-emerald-100 bg-emerald-50/60 p-3 dark:border-emerald-900 dark:bg-emerald-950/30">
      <label className="block">
        <span className={labelClassName}>{label}</span>
        <input
          type="date"
          className={fieldClassName}
          {...register(name, {
            onChange: () => {
              interval.current = null;
            },
          })}
        />
      </label>
      <p className="mt-1 text-xs text-stone-500">
        {latest?.administeredAt
          ? "Counted from the last time this treatment was given. Leave it empty if none is scheduled."
          : "Set this even if the administration date is unknown."}
      </p>
      <button type="button" onClick={() => { interval.current = null; setValue(name, ""); }} className="mt-1 text-xs font-medium text-stone-500 hover:text-stone-800 dark:hover:text-stone-200">Clear date</button>
      {latest?.administeredAt && <div className="mt-2 flex flex-wrap gap-2">
        {treatmentIntervals.map((item) => (
          <button key={item.months} type="button" onClick={() => chooseInterval(item.months)} className="rounded-full border border-stone-300 bg-white px-2.5 py-1 text-xs text-stone-700 hover:bg-stone-50 dark:border-stone-600 dark:bg-stone-950 dark:text-stone-200 dark:hover:bg-stone-800">
            {item.label}
          </button>
        ))}
        <label className="flex items-center gap-1.5 text-xs text-stone-600 dark:text-stone-300">
          Custom
          <input
            type="number"
            min={1}
            max={36}
            aria-label={`${label} custom interval in months`}
            className="w-16 rounded-lg border border-stone-300 bg-white px-2 py-1 text-sm dark:border-stone-700 dark:bg-stone-950"
            onChange={(event) => {
              const months = Number(event.target.value);
              if (Number.isInteger(months) && months >= 1 && months <= 36) chooseInterval(months);
            }}
          />
        </label>
      </div>}
    </div>
  );
}

export function CarePetInfo({ species }: { species: "CAT" | "DOG" | undefined }) {
  const { register, control } = useFormContext();
  const today = formatTodayDate();
  const {
    fields: vaccinationFields,
    append: appendVaccination,
    remove: removeVaccination,
  } = useFieldArray({ control, name: "vaccinations" });
  const {
    fields: treatmentsFields,
    append: appendTreatment,
    remove: removeTreatment,
  } = useFieldArray({ control, name: "treatments" });
  const vaccinations = useWatch({ name: "vaccinations" });

  function addNewVaccineForm() {
    const options = getAvailableVaccinationOptions(species, vaccinations, vaccinationFields.length);
    appendVaccination({
      type: options[0],
      administeredAt: "",
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <p className={labelClassName}>Vaccinations</p>
          {vaccinationFields.map((field, index) => {
            const availableTypes = getAvailableVaccinationOptions(species, vaccinations, index);

            return (
              <div key={field.id} className="mt-2 space-y-2 rounded-lg border border-stone-200 p-3 dark:border-stone-700">
                <label className="block">
                  <span className={labelClassName}>Dose</span>
                  <select key={availableTypes.join()} className={fieldClassName} {...register(`vaccinations.${index}.type`)}>
                    {availableTypes.map((type) => (
                      <option key={type} value={type}>
                        {vaccinationLabels[type]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className={labelClassName}>Date administered</span>
                  <input type="date" max={today} className={fieldClassName} {...register(`vaccinations.${index}.administeredAt`)} />
                </label>
                <button type="button" onClick={() => removeVaccination(index)} className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-800 transition hover:bg-stone-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/40 active:scale-[0.98] dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100 dark:hover:bg-stone-800">
                  Remove
                </button>
              </div>
            );
          })}
        <button type="button" onClick={addNewVaccineForm} className="mt-2 rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm font-medium text-stone-800 transition hover:bg-stone-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/40 active:scale-[0.98] dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100 dark:hover:bg-stone-800">
          + Add Vaccination
        </button>
        <NextVaccineDue species={species} />
      </div>

      <div>
        <p className={labelClassName}>Treatments</p>
        {treatmentsFields.map((field, index) => (
          <div key={field.id} className="mt-2 space-y-2 rounded-lg border border-stone-200 p-3 dark:border-stone-700">
            <label className="block">
              <span className={labelClassName}>Treatment</span>
              <select className={fieldClassName} {...register(`treatments.${index}.type`)}>
                <option value="DEWORMING">Deworming</option>
                <option value="FLEA_TICK">Flea and tick treatment</option>
              </select>
            </label>
            <label className="block">
              <span className={labelClassName}>Date administered</span>
              <input type="date" max={today} className={fieldClassName} {...register(`treatments.${index}.administeredAt`)} />
            </label>
            <button type="button" onClick={() => removeTreatment(index)} className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-800 transition hover:bg-stone-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/40 active:scale-[0.98] dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100 dark:hover:bg-stone-800">
              Remove
            </button>
          </div>
        ))}
        <button type="button" onClick={() => appendTreatment({ type: "DEWORMING", administeredAt: "" })} className="mt-2 rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm font-medium text-stone-800 transition hover:bg-stone-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/40 active:scale-[0.98] dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100 dark:hover:bg-stone-800">
          + Add Treatment
        </button>
        <NextTreatmentDue type="DEWORMING" name="dewormingNextDueAt" label="Next deworming due" />
        <NextTreatmentDue type="FLEA_TICK" name="fleaNextDueAt" label="Next flea and tick treatment due" />
      </div>
    </div>
  );
}

export default function MedicalPetInfo() {
  const { register } = useFormContext();
  const today = formatTodayDate();
  const spayedNeuteredValue = useWatch({ name: "spayedNeutered" });

  return (
    <div className="space-y-4">
      <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm leading-6 text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100">
        Please complete this section with Dr. Zeina so the medical record is accurate and complete.
      </p>
      <div>
        <label htmlFor="currentWeight" className={labelClassName}>
          Current Weight
        </label>
        <div className="flex overflow-hidden rounded-lg border border-stone-300 shadow-sm focus-within:border-emerald-700 focus-within:ring-2 focus-within:ring-emerald-700/15 dark:border-stone-700 dark:focus-within:border-emerald-400 dark:focus-within:ring-emerald-400/20">
          <input
            id="currentWeight"
            type="number"
            placeholder="Current Weight"
            className="min-w-0 flex-1 border-0 bg-transparent px-3 py-2.5 text-sm text-stone-900 outline-none placeholder:text-stone-400 dark:text-stone-50"
            {...register("currentWeight", { valueAsNumber: true })}
          />
          <select
            className="border-l border-stone-200 bg-stone-50 px-3 py-2.5 text-sm text-stone-700 outline-none dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200"
            {...register("weightUnit")}
          >
            <option value="GRAMS">Grams</option>
            <option value="KG">KG</option>
          </select>
        </div>
      </div>

      <div>
        <p className={labelClassName}>Spayed/Neutered</p>
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-sm text-stone-800 dark:text-stone-200">
            <input type="radio" value="YES" className="size-4 accent-emerald-800 dark:accent-emerald-400" {...register("spayedNeutered")} />
            Yes
          </label>
          <label className="flex items-center gap-2 text-sm text-stone-800 dark:text-stone-200">
            <input type="radio" value="NO" className="size-4 accent-emerald-800 dark:accent-emerald-400" {...register("spayedNeutered")} />
            No
          </label>
          <label className="flex items-center gap-2 text-sm text-stone-800 dark:text-stone-200">
            <input type="radio" value="UNKNOWN" className="size-4 accent-emerald-800 dark:accent-emerald-400" {...register("spayedNeutered")} />
            Unknown
          </label>
        </div>
        {spayedNeuteredValue === "YES" && (
          <div className="mt-2">
            <label htmlFor="spayedNeuteredAt" className={labelClassName}>
              Spayed/Neutered At
            </label>
            <input type="date" id="spayedNeuteredAt" max={today} className={fieldClassName} {...register("spayedNeuteredAt")} />
          </div>
        )}
      </div>

      <div>
        <label htmlFor="allergies" className={labelClassName}>
          Allergies
        </label>
        <textarea id="allergies" className={textareaClassName} {...register("allergies")} />
      </div>

      <div>
        <label htmlFor="medicalConditions" className={labelClassName}>
          Chronic/Medical Conditions
        </label>
        <textarea id="medicalConditions" className={textareaClassName} {...register("medicalConditions")} />
      </div>

      <div>
        <label htmlFor="medications" className={labelClassName}>
          Medications
        </label>
        <textarea id="medications" className={textareaClassName} {...register("medications")} />
      </div>

      <div>
        <label htmlFor="diet" className={labelClassName}>
          Diet
        </label>
        <textarea id="diet" className={textareaClassName} {...register("diet")} />
      </div>

      <div>
        <label htmlFor="previousHistory" className={labelClassName}>
          Previous History
        </label>
        <textarea id="previousHistory" placeholder="Surgeries, hospital stays, and other past treatment" className={textareaClassName} {...register("previousHistory")} />
      </div>
    </div>
  );
}
