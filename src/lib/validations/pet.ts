import { z } from "zod";

/* HTML input fields return string values, even when the type is set to number.
RHF's register function has a valueAsNumber option that converts the string to a number -> so we set valueAsNumber: true.
But if the field is left empty, the returned value will be NaN. 
We want to convert NaN to undefined so that the field is optional so we created a schema with a preprocessing function.
*/
const optionalEstimatedAge = z.preprocess(
  (value: number | undefined) => (value == null || Number.isNaN(value) ? undefined : value), // if number is NaN, return undefined, else return the number
  z // inner schema
    .number()
    .min(0, { message: "Age must be a non-negative number" })
    .optional(),
);

export const basicPetSchema = z.object({
  name: z.string().trim().min(1, { message: "Name is required" }), // trim() removes whitespace from both ends of the string so that a string with only whitespace is considered empty. It also ensures that the data saved to the database does not have leading or trailing whitespace.
  species: z.enum(["CAT", "DOG"]),
  sex: z.enum(["MALE", "FEMALE"]),
  breed: z.string().trim().optional(),
  color: z.string().trim().optional(),
  dateOfBirth: z.string().optional(),
  estimatedAge: optionalEstimatedAge,
  estimatedAgeUnit: z.enum(["DAYS", "WEEKS", "MONTHS", "YEARS"]).optional(),
  lifestyle: z.enum(["INDOOR", "OUTDOOR", "HYBRID"]).optional(),
  photo: z
    .file()
    .max(5 * 1024 * 1024, { message: "Photo must be under 5 MB" }) // maximum file size in bytes
    .refine((file) => file.type.startsWith("image/"), { message: "Photo must be an image" }) // adding another validation rule; refine() lets us provide our own condition.
    .optional(),
  removePhoto: z.boolean().optional(), // true when the owner removes the photo. A new file still replaces the saved one.
});

const optionalCurrentWeight = z.preprocess(
  (value: number | undefined) => (value == null || Number.isNaN(value) ? undefined : value), // if value is null or isNaN, turn it into undefined. else, return the value as it is
  z.number().min(0, { message: "Weight must be a non-negative number" }).optional(),
);


/* optionalAdministeredAt is used for optional dates because when left empty, an <input type="date"/> will return an empty string "" 
While z.optional() expects undefined, so we must preprocess the value and turn it into undefined in case of empty string */
const optionalAdministeredAt = z.preprocess(
  (value: string) => (value === "" ? undefined : value),
  z.iso.date().optional(),
);

export const medicalPetSchema = z.object({
  currentWeight: optionalCurrentWeight,
  weightUnit: z.enum(["GRAMS", "KG"]).optional(),

  spayedNeutered: z.enum(["YES", "NO", "UNKNOWN"]).nullable().optional(), // spayedNeutered is a radio group in the form. When no radio option is selected, RHF returns null so we must add nullable() otherwise validation will fail (null is an acceptable value since this field is optional)
  spayedNeuteredAt: optionalAdministeredAt,

  vaccinations: z.array(
    z.object({
      type: z.enum(["FIRST", "SECOND", "THIRD", "ANNUAL"]),
      administeredAt: optionalAdministeredAt,
    })
  ),
  treatments: z.array(
    z.object({
      type: z.enum(["DEWORMING", "FLEA_TICK"]),
      administeredAt: optionalAdministeredAt,
    }
  )),

  allergies: z.string().optional(),
  medicalConditions: z.string().optional(),
  medications: z.string().optional(),
  diet: z.string().optional(),
  previousHistory: z.string().optional(),
});

export const petSchema = z.object({
  ...basicPetSchema.shape,
  ...medicalPetSchema.shape,
});

export type BasicPetInfo = z.infer<typeof basicPetSchema>;
export type MedicalPetInfo = z.infer<typeof medicalPetSchema>;
export type PetForm = z.infer<typeof petSchema>;