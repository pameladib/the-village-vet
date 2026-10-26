"use client";

import { useFormContext, useWatch, useFieldArray } from "react-hook-form";
import { formatTodayDate } from "@/lib/helpers/dates";
const catVaccinationTypes = ["FIRST", "SECOND", "ANNUAL"] as const;
const dogVaccinationTypes = ["FIRST", "SECOND", "THIRD", "ANNUAL"] as const;

const vaccinationLabels = {
  FIRST: "First",
  SECOND: "Second",
  THIRD: "Third",
  ANNUAL: "Annual",
} as const;


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

export default function MedicalPetInfo({ species }: { species: "CAT" | "DOG" | undefined }) {
  const { register, control } = useFormContext();
  const today = formatTodayDate();

  const { 
    fields: vaccinationFields, 
    append: appendVaccination, 
    remove: removeVaccination } = useFieldArray({
    control,
    name: "vaccinations",
  });

  const { 
    fields: treatmentsFields, 
    append: appendTreatment, 
    remove: removeTreatment } = useFieldArray({
    control,
    name: "treatments",
  });
  
  const spayedNeuteredValue = useWatch({ name: "spayedNeutered" });
  const vaccinations = useWatch({ name: "vaccinations" });

  function addNewVaccineForm() {
    appendVaccination({
      administeredAt: "", // we omitted type on purpose so the default value of the select is the first option in the filtered array of available vaccination types based on the species and the not-yet-selected types in the other rows. This ensures that the user cannot select a type that has already been selected in another row, except for Annual which can be selected multiple times.
    });
  }

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
        <p className={labelClassName}>Vaccinations</p>
          {vaccinationFields.map((field, index) => {
            const availableTypes = getAvailableVaccinationOptions(species, vaccinations, index);

            return (
              <div key={field.id} className="flex mt-2"> {/* use field.id as key to ensure that React can efficiently update the list when items are added or removed. */}
                <select key={availableTypes.join()} className={fieldClassName} {...register(`vaccinations.${index}.type`)}>
                  {availableTypes.map((type) => (
                    <option key={type} value={type}>
                      {vaccinationLabels[type]}
                    </option>
                  ))}
                </select>
                <input type="date" max={today} className={fieldClassName} {...register(`vaccinations.${index}.administeredAt`)} />
                <button type="button" onClick={() => removeVaccination(index)} className="ml-2 rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm font-medium text-stone-800 transition hover:bg-stone-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/40 active:scale-[0.98] dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100 dark:hover:bg-stone-800">
                  Remove
                </button>
              </div>
            );
          })}
        <button type="button" onClick={addNewVaccineForm} className="rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm font-medium text-stone-800 transition hover:bg-stone-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/40 active:scale-[0.98] dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100 dark:hover:bg-stone-800">
          + Add Vaccination
        </button>
      </div>

      <div>
        <p className={labelClassName}>Treatments</p>
        {treatmentsFields.map((field, index) => (
          <div key={field.id} className="flex mt-2">
            <select className={fieldClassName} {...register(`treatments.${index}.type`)}>
              <option value="DEWORMING">Deworming</option>
              <option value="FLEA_TICK">Flea & Tick Treatment</option>
            </select>
            <input type="date" max={today} className={fieldClassName} {...register(`treatments.${index}.administeredAt`)} />
            <button type="button" onClick={() => removeTreatment(index)} className="ml-2 rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm font-medium text-stone-800 transition hover:bg-stone-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/40 active:scale-[0.98] dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100 dark:hover:bg-stone-800">
              Remove
            </button>
          </div>
        ))}
        <button type="button" onClick={() => appendTreatment({administeredAt: "" })} className="ml-2 rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm font-medium text-stone-800 transition hover:bg-stone-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/40 active:scale-[0.98] dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100 dark:hover:bg-stone-800">
          + Add Treatment
        </button>
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
