"use client";

import { Camera, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useFormContext, useFormState, useWatch } from "react-hook-form";
import { formatTodayDate } from "@/lib/helpers/dates";

const fieldClassName =
  "w-full min-w-0 rounded-lg border bg-white px-3 py-2.5 text-sm text-stone-900 shadow-sm outline-none transition placeholder:text-stone-400 dark:bg-stone-950 dark:text-stone-50";

const validFieldClassName =
  "border-stone-300 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15 dark:border-stone-700 dark:focus:border-emerald-400 dark:focus:ring-emerald-400/20";

const invalidFieldClassName =
  "border-red-600 focus:border-red-600 focus:ring-2 focus:ring-red-600/15";

function fieldClasses(invalid: boolean) {
  return `${fieldClassName} ${invalid ? invalidFieldClassName : validFieldClassName}`;
}

const labelClassName =
  "mb-1.5 block text-sm font-medium text-stone-800 dark:text-stone-200";

const fieldErrorClassName = "mt-1.5 text-sm text-red-700 dark:text-red-300";

function fieldMessage(error: { message?: unknown } | undefined) {
  return typeof error?.message === "string" ? error.message : undefined;
}

export default function BasicPetInfo({
  title,
  photoUrl,
  lockIdentity = false,
}: {
  title: string; // title is "Edit pet" for the edit form and "New pet" for the add form
  photoUrl?: string | null; // photoUrl is the URL of the pet's existing photo. It's an optional props because when this component is used for adding a pet, photoUrl is not passed. When the component is used for editing the pet, photoUrl is always passed, but it can either be a string if the pet has a saved photo, or null if it doesn't have a saved photo
  lockIdentity?: boolean;
}) {
  const { register, setValue } = useFormContext();
  const { errors } = useFormState(); // we are reading errors using useFormState instead of useFormContext because we want the component to re-render when errors change so the error messages next to the fields are updated in real-time as the user types. If we used useFormContext, the component would not re-render when errors change and the error messages would not be updated in real-time.

  /* we are watching the photo field because we want the preview to update when the selected photo changes 
  the user selects a new file -> the form's photo field receives that file -> useWatch detects the change -> React re-renders the component -> the preview updates 
  */
  const photo = useWatch({ name: "photo" }); 
  const photoRemoved = useWatch({ name: "removePhoto" }); // true after the owner clicks X. Watched so the preview updates when the saved photo is removed and the file field itself did not change.

  const [previewUrl, setPreviewUrl] = useState<string | null>(null); // temporary URL for a newly selected photo (when a new photo is selected, we want to preview it first and then we save once the user submits the form)
  const today = formatTodayDate();


  useEffect(() => {
    if (!(photo instanceof File)) {
      setPreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(photo);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  const displayUrl = previewUrl ?? (photoRemoved ? null : photoUrl); // a newly chosen file wins. Otherwise a removed photo stays hidden, including a photo that was already saved.

  function onPhotoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; // get the first file from the input. ? is used for optional chaining in case no file is selected, in which case file will be undefined. We use [0] to get the first file because the input allows multiple files to be selected, but we only want the first one.
    event.target.value = "";

    if (!file) return; // if no file is selected, do nothing

    setValue("photo", file, { shouldValidate: true }); // set the photo field value in the form state and trigger validation immediately upon selection so the error appears immediately in errors.photo if the file is invalid. shouldValidate: true ensures that the validation runs immediately after setting the value.
  }

  function onRemovePhoto() {
    setValue("removePhoto", true);
    setValue("photo", undefined, { shouldValidate: true }); // undefined matches the optional file schema. null would fail validation.
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium tracking-[0.22em] text-emerald-800 uppercase dark:text-emerald-300">
            The Village Vet
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-50">
            {title}
          </h1>
        </div>
        <div className="relative size-28 shrink-0">
          <label
            htmlFor="photo"
            className={displayUrl ? "block size-full cursor-pointer overflow-hidden rounded-xl" : "flex size-full cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-stone-300 bg-stone-50 text-stone-500 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-400"}
          >
            {displayUrl ? (
              <img src={displayUrl} alt="" className="size-full object-cover" />
            ) : (
              <>
                <Camera className="size-6" strokeWidth={1.5} />
                <span className="text-xs">Add photo</span>
              </>
            )}
          </label>
          {displayUrl && (
            <button
              type="button"
              onClick={onRemovePhoto}
              className="absolute -top-2 -right-2 flex size-7 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-700 shadow-sm transition hover:border-emerald-700 hover:text-emerald-800 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:hover:border-emerald-400 dark:hover:text-emerald-200"
            >
              <X className="size-4" strokeWidth={1.5} />
            </button>
          )}
        </div>
      </div>
      <input id="photo" type="file" accept="image/*" className="hidden" onChange={onPhotoChange} />
      {fieldMessage(errors.photo) && <p className={fieldErrorClassName}>{fieldMessage(errors.photo)}</p>}
      <p className="mt-6 text-xs text-stone-500 dark:text-stone-400">* Required fields</p>
      <div className="mt-4 space-y-4">
        <div>
          <label htmlFor="name" className={labelClassName}>
            Name <span className="text-stone-400 dark:text-stone-500">*</span>
          </label>
          <input
            id="name"
            type="text"
            placeholder="Pet Name"
            className={fieldClasses(Boolean(errors.name))}
            {...register("name")}
          />
          {fieldMessage(errors.name) && <p className={fieldErrorClassName}>{fieldMessage(errors.name)}</p>}
        </div>

        <div className={lockIdentity ? "pointer-events-none opacity-60" : undefined}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="species" className={labelClassName}>
              Species <span className="text-stone-400 dark:text-stone-500">*</span>
            </label>
            <select id="species" className={fieldClasses(Boolean(errors.species))} {...register("species")}>
              <option value="CAT">Cat</option>
              <option value="DOG">Dog</option>
            </select>
            {fieldMessage(errors.species) && <p className={fieldErrorClassName}>{fieldMessage(errors.species)}</p>}
          </div>

          <div>
            <label htmlFor="sex" className={labelClassName}>
              Sex <span className="text-stone-400 dark:text-stone-500">*</span>
            </label>
            <select id="sex" className={fieldClasses(Boolean(errors.sex))} {...register("sex")}>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
            </select>
            {fieldMessage(errors.sex) && <p className={fieldErrorClassName}>{fieldMessage(errors.sex)}</p>}
          </div>
        </div>

        <div>
          <label htmlFor="breed" className={labelClassName}>
            Breed
          </label>
          <input
            id="breed"
            type="text"
            placeholder="Breed"
            className={fieldClasses(Boolean(errors.breed))}
            {...register("breed")}
          />
          {fieldMessage(errors.breed) && <p className={fieldErrorClassName}>{fieldMessage(errors.breed)}</p>}
        </div>

        <div>
          <label htmlFor="color" className={labelClassName}>
            Color
          </label>
          <input
            id="color"
            type="text"
            placeholder="Color"
            className={fieldClasses(Boolean(errors.color))}
            {...register("color")}
          />
          {fieldMessage(errors.color) && <p className={fieldErrorClassName}>{fieldMessage(errors.color)}</p>}
        </div>
        </div>

        <div>
          <label htmlFor="dateOfBirth" className={labelClassName}>
            Date of birth
          </label>
          <input
            id="dateOfBirth"
            type="date"
            max={today}
            placeholder="Date of Birth"
            className={`${fieldClasses(Boolean(errors.dateOfBirth))} dark:[color-scheme:dark]`}
            {...register("dateOfBirth")}
          />
          {fieldMessage(errors.dateOfBirth) && <p className={fieldErrorClassName}>{fieldMessage(errors.dateOfBirth)}</p>}
          <p className="mt-1.5 text-sm text-stone-500 dark:text-stone-400">
            If you don&apos;t know the date of birth, enter an estimated age instead.
          </p>
        </div>

        <div>
          <label htmlFor="estimatedAge" className={labelClassName}>
            Estimated age
          </label>
          <div className={`flex overflow-hidden rounded-lg border shadow-sm ${errors.estimatedAge || errors.estimatedAgeUnit ? "border-red-600 focus-within:border-red-600 focus-within:ring-2 focus-within:ring-red-600/15" : "border-stone-300 focus-within:border-emerald-700 focus-within:ring-2 focus-within:ring-emerald-700/15 dark:border-stone-700 dark:focus-within:border-emerald-400 dark:focus-within:ring-emerald-400/20"}`}>
            <input
              id="estimatedAge"
              type="number"
              placeholder="Estimated Age"
              className="min-w-0 flex-1 border-0 bg-transparent px-3 py-2.5 text-sm text-stone-900 outline-none placeholder:text-stone-400 dark:text-stone-50"
              {...register("estimatedAge", { valueAsNumber: true })}
            />
            <select
              className="border-l border-stone-200 bg-stone-50 px-3 py-2.5 text-sm text-stone-700 outline-none dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200"
              {...register("estimatedAgeUnit")}
            >
              <option value="DAYS">Days</option>
              <option value="WEEKS">Weeks</option>
              <option value="MONTHS">Months</option>
              <option value="YEARS">Years</option>
            </select>
          </div>
          {fieldMessage(errors.estimatedAge) && <p className={fieldErrorClassName}>{fieldMessage(errors.estimatedAge)}</p>}
          {fieldMessage(errors.estimatedAgeUnit) && <p className={fieldErrorClassName}>{fieldMessage(errors.estimatedAgeUnit)}</p>}
          <p className="mt-1.5 text-sm text-stone-500 dark:text-stone-400">
            Not needed when a date of birth is provided.
          </p>
        </div>

        <div className={lockIdentity ? "pointer-events-none opacity-60" : undefined}>
          <label htmlFor="lifestyle" className={labelClassName}>
            Lifestyle
          </label>
          <select id="lifestyle" className={fieldClasses(Boolean(errors.lifestyle))} {...register("lifestyle")}>
            <option value="INDOOR">Indoor</option>
            <option value="OUTDOOR">Outdoor</option>
            <option value="HYBRID">Hybrid</option>
          </select>
          {fieldMessage(errors.lifestyle) && <p className={fieldErrorClassName}>{fieldMessage(errors.lifestyle)}</p>}
        </div>
        {lockIdentity && (
          <p className="text-sm text-stone-500 dark:text-stone-400">You can change the name, photo, and age. The clinic keeps the other details.</p>
        )}
      </div>
    </div>
  );
}


/* Photo handling explanation:
- This component takes an optional photoUrl props. When it's called from the add page, photoUrl is not passed. When it's called from the edit page, photoUrl is always passed. It can be a string (if the saved photo exists) or null (if the pet has no saved photo) 
- We also define a previewUrl state variable to store the URL of a new photo if the user selects one
- The displayUrl variable contains the URL that we use for previewing the photo. A newly chosen file (previewUrl) wins. Otherwise it is photoUrl, unless the owner clicked X (removePhoto), in which case the saved photo stays hidden.
- displayUrl is null when the pet has no saved photo, or when the owner clicked X. It is undefined when the component is used for adding a new pet and no file is selected. In these cases, we display a camera icon alongside an "Add photo" label (the ? operator treats null and undefined the same)
- if displayUrl is a string (not null/undefined), we display an <img> element whose source is the URL in displayUrl, plus an X button. Clicking X sets removePhoto and clears the photo field. The stored file is deleted when the edit is saved.

- When the user selects a new file, the onPhotoChange handler runs. It sets the photo field of the form to the new file
- Since we are watching this photo field using useWatch(), when onPhotoChange updates it, React re-renders the component
- When the component re-renders, the useEffect block runs because photo is in the dependency array
- useEffect updates the previewUrl state variable which triggers another re-render of the component -> displayUrl is updated and set to previewUrl and thus the new photo is displayed in the photo picker
*/