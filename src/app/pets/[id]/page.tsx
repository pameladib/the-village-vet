import PetProfile from "@/components/pets/pet-profile/PetProfile";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";

export default async function PetProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let session;
  try {
        session = await requireRole(["OWNER", "ADMIN"]);
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message === "User is not authenticated" ||
        error.message === "User does not have the required role")
    ) {
      redirect("/");
    }
    throw error;
  }

  let pet;

  pet = await prisma.pet.findFirst({
    where: session.user.role === "ADMIN" ? { id } : { id, ownerId: session.user.id },
    include: {
      weightRecords: { // current weight is the latest weight record, not a column on the pet
        orderBy: { recordedAt: "desc" },
        take: 1,
        select: { weightGrams: true },
      },
      vaccinations: { select: { id: true, type: true, administeredAt: true } },
      treatments: { select: { id: true, type: true, administeredAt: true } },
      appointments: {
        where: { status: "BOOKED", startAt: { gte: new Date() } },
        orderBy: { startAt: "asc" },
        select: { id: true, type: true, services: true, groomingService: true, startAt: true, duration: true },
      },
      documents: {
        orderBy: { createdAt: "desc" },
        select: { id: true, title: true },
      },
    },
  });

  if (!pet) notFound(); // if query succeeds but no pet is found, query returns null. notFound() displays our custom not-found.tsx page

  /* 
  The estimatedAgeValue field in the Pet model is of type Decimal
  When Prisma retrieves the value, it returns a Decimal object, not an ordinary JavaScript number
  Client components do not support Decimal props so we must convert the Decimal object into a normal JS number before passing it to PetProfile
  We cannot just remove it because the pet profile needs to display the age
  */
  const { weightRecords, estimatedAgeValue, vaccinations, treatments, appointments, documents, ...petFields } = pet;

  const profilePet = {
    ...petFields, // using spread to copy the existing properties of the pet object into a new object
    estimatedAgeValue: estimatedAgeValue?.toNumber() ?? null, // optional chaining in case estimatedAgeValue is null or undefined. If it is, return null instead
    currentWeightGrams: weightRecords[0]?.weightGrams ?? null,
    vaccinations, // given doses only. A due date is not stored on these rows yet
    treatments,
    appointments,
  }

  return (
    <PetProfile
      pet={profilePet}
      documents={documents}
      canUpload
    />
  );
}
