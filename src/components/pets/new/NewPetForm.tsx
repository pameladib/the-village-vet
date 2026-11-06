"use client";

import { useForm, FormProvider, useWatch } from "react-hook-form";
import { petSchema, type PetForm } from "@/lib/validations/pet";
import { zodResolver } from "@hookform/resolvers/zod";
import BasicPetInfo from "./BasicPetInfo";
import MedicalPetInfo from "./MedicalPetInfo";
import { useState } from "react";
import { createPet, updatePet } from "@/lib/actions/pet";
import { confirmPetPhoto, preparePetPhotoUpload } from "@/lib/actions/photo";
import { uploadToSignedUrl } from "@/lib/storage/direct-upload";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { petPhotoSrc } from "@/lib/storage/files";

async function storePetPhoto(petId: string, file: File) {
  const prepared = await preparePetPhotoUpload(petId, { contentType: file.type, size: file.size });
  if (!prepared.success) {
    return `The pet was saved, but the photo could not be stored. ${prepared.formErrors[0] ?? ""}`.trim();
  }
  try {
    await uploadToSignedUrl(prepared.signedUrl, file);
  } catch {
    return "The pet was saved, but the photo could not be stored.";
  }
  const confirmed = await confirmPetPhoto(petId, { key: prepared.key, contentType: file.type });
  if (!confirmed.success) {
    return `The pet was saved, but the photo could not be stored. ${confirmed.formErrors[0] ?? ""}`.trim();
  }
  return null;
}

const basicFields = [
  "name",
  "species",
  "sex",
  "breed",
  "color",
  "dateOfBirth",
  "estimatedAge",
  "estimatedAgeUnit",
  "lifestyle",
  "photo",
] as const;

const activeStepClassName =
  "flex-1 bg-emerald-800 px-3 py-2 text-center font-medium text-white dark:bg-emerald-700";

const inactiveStepClassName =
  "flex-1 bg-stone-100 px-3 py-2 text-center text-stone-500 dark:bg-stone-800 dark:text-stone-400";


/* 
this form is used for both adding and updating a pet
the isFirstPet and ownerName props are needed only for adding a pet
defaultValues, photoUrl and id are for updating a pet (id is to identify the pet and send it to the updatePet action)
for this reason we made all 5 props optional so we can pass them as needed or leave them out when not needed
*/ 
export default function NewPetForm({ isFirstPet, ownerName, defaultValues, photoUrl, id, allowClinical = false }: { isFirstPet?: boolean; ownerName?: string; defaultValues?: PetForm; photoUrl?: string | null; id?: string; allowClinical?: boolean }) {
  const [step, setStep] = useState(1); // 1 for Basic Info, 2 for Medical Info
  const [formError, setFormError] = useState<string | null>(null);
  const [petId, setPetId] = useState(id);
  const router = useRouter();

  const form = useForm<PetForm>({
    resolver: zodResolver(petSchema),
    mode: "onChange", // validation happens upon every input change, not just on submit
    defaultValues: defaultValues ?? { // for edit, use the defaultValues props. if it's null, it means we're calling the form for adding a new pet, in which case we use the object after ?? 
      vaccinations: [], // vaccinations and treatments are required arrays in the Zod schema so we must initialize them to empty array [] in case the user leaves them empty (so Zod does not reject them)
      treatments: [],
    }
  });
  const species = useWatch({ control: form.control, name: "species" });
  const isSubmitting = form.formState.isSubmitting;

  async function handleContinue() {
    const basicStepIsValid = await form.trigger(basicFields);
    if (!basicStepIsValid) return;

    if (form.getValues("species") === "CAT") {
      const vaccinations = form.getValues("vaccinations") ?? [];
      if (vaccinations.some((vaccination) => vaccination.type === "THIRD")) {
        form.setValue(
          "vaccinations",
          vaccinations.filter((vaccination) => vaccination.type !== "THIRD"),
        );
      }
    }

    setStep((prevStep) => prevStep + 1);
  }

  function handleBack() {
    setStep((prevStep) => prevStep - 1);
  }

  async function onSubmit(data: PetForm) { // this function only runs when the values are valid because form.handleSubmit already runs the Zod checks before it calls onSubmit
    if (defaultValues && !id) {
      setFormError("Could not save this pet.");
      return;
    }

    // The photo is not part of the pet save. The browser sends it straight to Supabase with a signed URL.
    const file = data.photo instanceof File ? data.photo : null;
    const payload: PetForm = { ...data, photo: undefined, removePhoto: file ? false : data.removePhoto };
    const result = petId ? await updatePet(petId, payload) : await createPet(payload);

    if (!result.success || !result.id) {
      setFormError(result.formErrors?.[0] ?? "Could not save this pet."); // show the error message set by the server action when it exists, otherwise use the backup sentence
      return;
    }
    const savedId = result.id;

    if (file) {
      const photoError = await storePetPhoto(savedId, file);
      if (photoError) {
        setPetId(savedId);
        setFormError(photoError);
        return;
      }
    }

    setFormError(null);
    router.push(`/pets/${savedId}`);
  }

  return (
    <FormProvider {...form}>
      <div className="flex flex-1 items-start justify-center bg-stone-100 px-4 py-10 font-sans dark:bg-stone-950 sm:px-6">
        <div className="w-full max-w-md">
          {defaultValues && id && (
            <Link
              href={`/pets/${id}`}
              className="mb-6 inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-white px-3 py-2 text-sm font-medium text-stone-700 transition duration-200 hover:scale-[1.03] hover:border-emerald-700 hover:text-emerald-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/40 active:scale-[0.98] dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:hover:border-emerald-400 dark:hover:text-emerald-200"
            >
              <ChevronLeft className="size-4" strokeWidth={1.5} />
              Back to profile
            </Link>
          )}
          {defaultValues ? (
            <h1 className="text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-50">
              Edit {defaultValues.name}
            </h1>
          ) : isFirstPet ? (
            <>
              <h1 className="rounded-2xl bg-emerald-800 px-5 py-4 text-2xl font-semibold tracking-tight text-white dark:bg-emerald-700">
                Welcome, {ownerName}
              </h1>
              <h2 className="mt-6 text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-50">
                Add your first pet
              </h2>
            </>
          ) : (
            <h1 className="text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-50">
              Add another pet
            </h1>
          )}
          <div className="mt-2 text-sm leading-6 text-stone-500 dark:text-stone-400">
            {defaultValues ? ( 
              <p>Update this pet’s details.</p>
            ) : (
               step === 1 ? (
                <p>Let&apos;s start with some basic information about your pet.</p>
               ) : (
                <p>Add the medical details.</p>
               ) 
              
            )
            }
          </div>
          {allowClinical && (
          <div className="mt-6 mb-6 flex overflow-hidden rounded-lg border border-stone-200 text-sm dark:border-stone-700">
            <div className={step === 1 ? activeStepClassName : inactiveStepClassName}>
              Basic Information
            </div>
            <div className={step === 2 ? activeStepClassName : inactiveStepClassName}>
              Medical Information
            </div>
          </div>
          )}
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-stone-900 sm:p-8"
          >
            {step === 1 && (
              <BasicPetInfo
                title={defaultValues ? "Edit pet" : "New pet"}
                photoUrl={id ? petPhotoSrc(id, photoUrl) : photoUrl}
                lockIdentity={Boolean(id) && !allowClinical}
              />
            )}
            {step === 2 && <MedicalPetInfo species={species} />}

            {step === 1 && allowClinical && (
              <button
                type="button"
                onClick={handleContinue}
                className="mt-6 w-full cursor-pointer rounded-lg bg-emerald-800 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/40 active:scale-[0.98] active:bg-emerald-950 dark:bg-emerald-700 dark:hover:bg-emerald-600 dark:active:bg-emerald-800"
              >
                Continue
              </button>
            )}
            {step === 1 && !allowClinical && (
              <>
                {formError && <p className="mt-6 text-sm text-red-700 dark:text-red-300">{formError}</p>}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="mt-6 w-full cursor-pointer rounded-lg bg-emerald-800 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-70 dark:bg-emerald-700"
                >
                  {isSubmitting ? "Saving..." : "Save pet"}
                </button>
              </>
            )}
            {isFirstPet && (
              <button
                type="button"
                onClick={() => router.push("/dashboard")}
                className="mt-3 w-full cursor-pointer rounded-lg px-4 py-2.5 text-sm font-medium text-stone-500 transition hover:text-stone-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/40 dark:text-stone-400 dark:hover:text-stone-100"
              >
                I&apos;ll add my pet later
              </button>
            )}
            {step === 2 && (
              <>
                {formError && <p className="mt-6 text-sm text-red-700 dark:text-red-300">{formError}</p>}
                <div className="mt-6 flex gap-3">
                  <button
                    type="button"
                    onClick={handleBack}
                    className="w-full cursor-pointer rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm font-medium text-stone-800 transition hover:bg-stone-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/40 active:scale-[0.98] dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100 dark:hover:bg-stone-800"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full cursor-pointer rounded-lg bg-emerald-800 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/40 active:scale-[0.98] active:bg-emerald-950 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-emerald-700 dark:hover:bg-emerald-600 dark:active:bg-emerald-800"
                  >
                    {defaultValues ? (
                      isSubmitting ? "Saving..." : "Save changes"
                    ) : (
                      isSubmitting ? "Adding..." : "Add pet"
                    ) }
                  </button>
                </div>
              </>
            )}
          </form>
        </div>
      </div>
    </FormProvider>
  );
}