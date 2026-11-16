import PetProfile from "@/components/pets/pet-profile/PetProfile";
import { careTiming } from "@/lib/appointments/availability";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { getLocale, messages } from "@/lib/i18n";

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
      redirect("/login");
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
        where: { status: { not: "CANCELLED" } },
        orderBy: { startAt: "desc" },
        select: { id: true, type: true, services: true, groomingService: true, startAt: true, duration: true },
      },
      owner: { select: { name: true, phoneNumber: true } },
      documents: {
        orderBy: { createdAt: "desc" },
        select: { id: true, title: true, contentType: true, createdAt: true },
      },
      careReminders: {
        where: { completedAt: null },
        orderBy: { dueAt: "asc" },
        select: { id: true, kind: true, dueAt: true, dose: true, vaccinationId: true, treatmentId: true },
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
  const { weightRecords, estimatedAgeValue, vaccinations, treatments, appointments, documents, careReminders, owner, ...petFields } = pet;
  const locale = await getLocale();

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
      documents={documents.map((document) => ({
        id: document.id,
        title: document.title,
        contentType: document.contentType,
        createdAt: document.createdAt.toISOString(),
      }))}
      canUpload
      canRecord={session.user.role === "ADMIN"}
      reminders={careReminders.map((reminder) => ({
        ...reminder,
        status: careTiming(reminder.dueAt),
      }))}
      backHref={session.user.role === "ADMIN" ? "/admin/patients" : "/dashboard"}
      owner={session.user.role === "ADMIN" ? { name: owner.name, phone: owner.phoneNumber } : undefined}
      copy={messages(locale)}
      locale={locale}
    />
  );
}
