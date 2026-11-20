"use client";

import { useEffect, useState } from "react";
import { useFormContext, useWatch, useFieldArray } from "react-hook-form";
import { formatTodayDate } from "@/lib/helpers/dates";
import { dateOnlyUtc, formatDateOnly, nextVaccineDue } from "@/lib/clinic/vaccines";
import type { PetForm } from "@/lib/validations/pet";
import type { Copy } from "@/lib/i18n";
const catVaccinationTypes = ["FIRST", "SECOND", "ANNUAL"] as const;
const dogVaccinationTypes = ["FIRST", "SECOND", "THIRD", "ANNUAL"] as const;

function vaccinationLabels(copy: Copy) {
  return {
    FIRST: copy.doseFirst,
    SECOND: copy.doseSecond,
    THIRD: copy.doseThird,
    ANNUAL: copy.doseAnnual,
  } as const;
}

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

function NextVaccineDue({ species, copy }: { species: "CAT" | "DOG" | undefined; copy: Copy }) {
  const { setValue, getValues } = useFormContext<PetForm>();
  const vaccinations = useWatch<PetForm, "vaccinations">({ name: "vaccinations" });
  const latest = latestDose(vaccinations);
  const annualsBefore = (vaccinations ?? []).filter((row) => row !== latest && row.type === "ANNUAL" && row.administeredAt).length;
  const given = latest?.administeredAt && latest.type ? dateOnlyUtc(latest.administeredAt) : null;
  const next = species && latest?.type && given
    ? nextVaccineDue(species, latest.type, given, latest.type === "ANNUAL" ? annualsBefore : 0)
    : null;
  const key = given && latest?.type ? `${species ?? ""}|${latest.type}|${latest.administeredAt}|${annualsBefore}` : "";
  const suggested = next ? formatDateOnly(next.dueAt) : "";
  const [tracked, setTracked] = useState(key);
  const [override, setOverride] = useState<string | null>(() => getValues("vaccineNextDueAt") || null);
  if (tracked !== key) {
    setTracked(key);
    setOverride(null);
  }
  const shown = override ?? suggested;

  useEffect(() => {
    setValue("vaccineNextDueAt", shown);
  }, [setValue, shown]);

  const threeWeeks = latest?.type === "FIRST" || (species === "DOG" && latest?.type === "SECOND");

  return (
    <div className="mt-3 rounded-lg border border-emerald-100 bg-emerald-50/60 p-3 dark:border-emerald-900 dark:bg-emerald-950/30">
      <label className="block">
        <span className={labelClassName}>{copy.petNextVaccine}</span>
        <input
          type="date"
          className={fieldClassName}
          value={shown}
          onChange={(event) => setOverride(event.target.value)}
        />
      </label>
      <p className="mt-1 text-xs text-stone-500">
        {latest?.administeredAt
          ? (threeWeeks ? copy.petSuggestWeeks : copy.petSuggestMonths)
          : copy.petDueUnknown}
      </p>
      <button type="button" onClick={() => setOverride("")} className="mt-1 text-xs font-medium text-stone-500 hover:text-stone-800 dark:hover:text-stone-200">{copy.clearDate}</button>
    </div>
  );
}

function NextTreatmentDue({
  type,
  name,
  label,
  copy,
}: {
  type: "DEWORMING" | "FLEA_TICK";
  name: "dewormingNextDueAt" | "fleaNextDueAt";
  label: string;
  copy: Copy;
}) {
  const { register, setValue } = useFormContext<PetForm>();
  const treatments = useWatch<PetForm, "treatments">({ name: "treatments" });
  const latest = latestDose(treatments, type);

  return (
    <div className="mt-3 rounded-lg border border-emerald-100 bg-emerald-50/60 p-3 dark:border-emerald-900 dark:bg-emerald-950/30">
      <label className="block">
        <span className={labelClassName}>{label}</span>
        <input
          type="date"
          className={fieldClassName}
          {...register(name)}
        />
      </label>
      <p className="mt-1 text-xs text-stone-500">
        {latest?.administeredAt ? copy.petTreatmentHint : copy.petDueUnknown}
      </p>
      <button type="button" onClick={() => setValue(name, "")} className="mt-1 text-xs font-medium text-stone-500 hover:text-stone-800 dark:hover:text-stone-200">{copy.clearDate}</button>
    </div>
  );
}

export function CarePetInfo({ species, copy }: { species: "CAT" | "DOG" | undefined; copy: Copy }) {
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
        <p className={labelClassName}>{copy.petVaccinations}</p>
          {vaccinationFields.map((field, index) => {
            const availableTypes = getAvailableVaccinationOptions(species, vaccinations, index);

            return (
              <div key={field.id} className="mt-2 space-y-2 rounded-lg border border-stone-200 p-3 dark:border-stone-700">
                <label className="block">
                  <span className={labelClassName}>{copy.colDose}</span>
                  <select key={availableTypes.join()} className={fieldClassName} {...register(`vaccinations.${index}.type`)}>
                    {availableTypes.map((type) => (
                      <option key={type} value={type}>
                        {vaccinationLabels(copy)[type]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className={labelClassName}>{copy.colGiven}</span>
                  <input type="date" max={today} className={fieldClassName} {...register(`vaccinations.${index}.administeredAt`)} />
                </label>
                <button type="button" onClick={() => removeVaccination(index)} className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-800 transition hover:bg-stone-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/40 active:scale-[0.98] dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100 dark:hover:bg-stone-800">
                  {copy.petRemove}
                </button>
              </div>
            );
          })}
        <button type="button" onClick={addNewVaccineForm} className="mt-2 rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm font-medium text-stone-800 transition hover:bg-stone-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/40 active:scale-[0.98] dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100 dark:hover:bg-stone-800">
          {copy.petAddVaccine}
        </button>
        <NextVaccineDue species={species} copy={copy} />
      </div>

      <div>
        <p className={labelClassName}>{copy.petTreatments}</p>
        {treatmentsFields.map((field, index) => (
          <div key={field.id} className="mt-2 space-y-2 rounded-lg border border-stone-200 p-3 dark:border-stone-700">
            <label className="block">
              <span className={labelClassName}>{copy.colTreatment}</span>
              <select className={fieldClassName} {...register(`treatments.${index}.type`)}>
                <option value="DEWORMING">{copy.doseDeworming}</option>
                <option value="FLEA_TICK">{copy.doseFlea}</option>
              </select>
            </label>
            <label className="block">
              <span className={labelClassName}>{copy.colGiven}</span>
              <input type="date" max={today} className={fieldClassName} {...register(`treatments.${index}.administeredAt`)} />
            </label>
            <button type="button" onClick={() => removeTreatment(index)} className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-800 transition hover:bg-stone-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/40 active:scale-[0.98] dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100 dark:hover:bg-stone-800">
              {copy.petRemove}
            </button>
          </div>
        ))}
        <button type="button" onClick={() => appendTreatment({ type: "DEWORMING", administeredAt: "" })} className="mt-2 rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm font-medium text-stone-800 transition hover:bg-stone-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/40 active:scale-[0.98] dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100 dark:hover:bg-stone-800">
          {copy.petAddTreatment}
        </button>
        <NextTreatmentDue type="DEWORMING" name="dewormingNextDueAt" label={copy.petNextDeworm} copy={copy} />
        <NextTreatmentDue type="FLEA_TICK" name="fleaNextDueAt" label={copy.petNextFlea} copy={copy} />
      </div>
    </div>
  );
}

export default function MedicalPetInfo({ copy }: { copy: Copy }) {
  const { register } = useFormContext();
  const today = formatTodayDate();
  const spayedNeuteredValue = useWatch({ name: "spayedNeutered" });

  return (
    <div className="space-y-4">
      <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm leading-6 text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100">
        {copy.petMedicalNote}
      </p>
      <div>
        <label htmlFor="currentWeight" className={labelClassName}>
          {copy.petWeight}
        </label>
        <div className="flex overflow-hidden rounded-lg border border-stone-300 shadow-sm focus-within:border-emerald-700 focus-within:ring-2 focus-within:ring-emerald-700/15 dark:border-stone-700 dark:focus-within:border-emerald-400 dark:focus-within:ring-emerald-400/20">
          <input
            id="currentWeight"
            type="number"
            placeholder={copy.petWeight}
            className="min-w-0 flex-1 border-0 bg-transparent px-3 py-2.5 text-sm text-stone-900 outline-none placeholder:text-stone-400 dark:text-stone-50"
            {...register("currentWeight", { valueAsNumber: true })}
          />
          <select
            className="border-l border-stone-200 bg-stone-50 px-3 py-2.5 text-sm text-stone-700 outline-none dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200"
            {...register("weightUnit")}
          >
            <option value="GRAMS">{copy.petGrams}</option>
            <option value="KG">{copy.petKg}</option>
          </select>
        </div>
      </div>

      <div>
        <p className={labelClassName}>{copy.petSpay}</p>
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-sm text-stone-800 dark:text-stone-200">
            <input type="radio" value="YES" className="size-4 accent-emerald-800 dark:accent-emerald-400" {...register("spayedNeutered")} />
            {copy.yes}
          </label>
          <label className="flex items-center gap-2 text-sm text-stone-800 dark:text-stone-200">
            <input type="radio" value="NO" className="size-4 accent-emerald-800 dark:accent-emerald-400" {...register("spayedNeutered")} />
            {copy.no}
          </label>
          <label className="flex items-center gap-2 text-sm text-stone-800 dark:text-stone-200">
            <input type="radio" value="UNKNOWN" className="size-4 accent-emerald-800 dark:accent-emerald-400" {...register("spayedNeutered")} />
            {copy.unknown}
          </label>
        </div>
        {spayedNeuteredValue === "YES" && (
          <div className="mt-2">
            <label htmlFor="spayedNeuteredAt" className={labelClassName}>
              {copy.petSpayAt}
            </label>
            <input type="date" id="spayedNeuteredAt" max={today} className={fieldClassName} {...register("spayedNeuteredAt")} />
          </div>
        )}
      </div>

      <div>
        <label htmlFor="allergies" className={labelClassName}>
          {copy.petAllergies}
        </label>
        <textarea id="allergies" className={textareaClassName} {...register("allergies")} />
      </div>

      <div>
        <label htmlFor="medicalConditions" className={labelClassName}>
          {copy.petConditions}
        </label>
        <textarea id="medicalConditions" className={textareaClassName} {...register("medicalConditions")} />
      </div>

      <div>
        <label htmlFor="medications" className={labelClassName}>
          {copy.petMedications}
        </label>
        <textarea id="medications" className={textareaClassName} {...register("medications")} />
      </div>

      <div>
        <label htmlFor="diet" className={labelClassName}>
          {copy.petDiet}
        </label>
        <textarea id="diet" className={textareaClassName} {...register("diet")} />
      </div>

      <div>
        <label htmlFor="previousHistory" className={labelClassName}>
          {copy.petHistory}
        </label>
        <textarea id="previousHistory" placeholder={copy.petHistoryPh} className={textareaClassName} {...register("previousHistory")} />
      </div>
    </div>
  );
}
