import PetProfile from "@/components/pets/pet-profile/PetProfile";
import { calendarDateInBeirut, careTiming, todayInBeirut } from "@/lib/appointments/availability";
import { canViewPetWeights } from "@/lib/auth/permissions";
import { petHasHistory } from "@/lib/pets/removal";
import { historyWeightsFromRecords } from "@/lib/pets/weight";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { getLocale, messages } from "@/lib/i18n";
import { refWhere } from "@/lib/slug";

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
    where: session.user.role === "ADMIN" ? refWhere(id) : { ...refWhere(id), ownerId: session.user.id },
    include: {
      weightRecords: { // current weight is the latest weight record, not a column on the pet
        orderBy: { recordedAt: "desc" },
        select: { weightGrams: true, recordedAt: true },
      },
      vaccinations: { select: { id: true, type: true, administeredAt: true } },
      treatments: { select: { id: true, type: true, administeredAt: true } },
      appointments: {
        where: { status: "BOOKED", startAt: { gte: new Date() } },
        orderBy: { startAt: "asc" },
        select: { id: true, type: true, services: true, groomingService: true, startAt: true, duration: true, status: true },
      },
      medicalVisits: {
        orderBy: { visitedAt: "desc" },
        select: { id: true, visitedAt: true, notes: true, type: true, services: true, appointmentId: true },
      },
      owner: { select: { id: true, name: true, phoneNumber: true } },
      documents: {
        orderBy: { createdAt: "desc" },
        select: { id: true, title: true, contentType: true, createdAt: true },
      },
      careReminders: {
        where: { completedAt: null },
        orderBy: { dueAt: "asc" },
        select: { id: true, kind: true, dueAt: true, dose: true, vaccinationId: true, treatmentId: true },
      },
      weights: {
        orderBy: { recordedAt: "desc" },
        select: { id: true, weight: true, recordedAt: true, notes: true, medicalVisitId: true },
      },
      _count: {
        select: {
          appointments: true,
          medicalVisits: true,
          vaccinations: true,
          treatments: true,
          weightRecords: true,
          weights: true,
          careReminders: true,
          visitFollowUps: true,
          documents: true,
        },
      },
    },
  });

  if (!pet) notFound(); // if query succeeds but no pet is found, query returns null. notFound() displays our custom not-found.tsx page
  if (pet.slug && id !== pet.slug) redirect(`/pets/${pet.slug}`);

  /* 
  The estimatedAgeValue field in the Pet model is of type Decimal
  When Prisma retrieves the value, it returns a Decimal object, not an ordinary JavaScript number
  Client components do not support Decimal props so we must convert the Decimal object into a normal JS number before passing it to PetProfile
  We cannot just remove it because the pet profile needs to display the age
  */
  if (!canViewPetWeights(session.user.role, session.user.id, pet.ownerId)) notFound();

  const { weightRecords, weights, estimatedAgeValue, vaccinations, treatments, appointments, medicalVisits, documents, careReminders, owner, _count, ...petFields } = pet;
  const carried = historyWeightsFromRecords(
    weightRecords,
    weights.map((row) => ({ weight: row.weight.toFixed(2), recordedAt: row.recordedAt })),
  );
  if (carried.length > 0) {
    const created = await prisma.petWeight.createManyAndReturn({
      data: carried.map((row) => ({ petId: pet.id, weight: row.weight, recordedAt: row.recordedAt })),
      select: { id: true, weight: true, recordedAt: true, notes: true, medicalVisitId: true },
    });
    weights.push(...created);
    weights.sort((a, b) => b.recordedAt.getTime() - a.recordedAt.getTime());
  }
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
      visits={medicalVisits.map((visit) => ({ ...visit, linked: Boolean(visit.appointmentId) }))}
      documents={documents.map((document) => ({
        id: document.id,
        title: document.title,
        contentType: document.contentType,
        createdAt: document.createdAt.toISOString(),
      }))}
      canUpload
      canRecord={session.user.role === "ADMIN"}
      canManage
      hasHistory={petHasHistory(_count)}
      reminders={careReminders.map((reminder) => ({
        ...reminder,
        status: careTiming(reminder.dueAt),
      }))}
      weights={weights.map((row) => ({
        id: row.id,
        weight: row.weight.toFixed(2),
        date: calendarDateInBeirut(row.recordedAt),
        notes: row.notes,
        linked: Boolean(row.medicalVisitId),
      }))}
      today={todayInBeirut()}
      backHref={session.user.role === "ADMIN" ? "/admin/patients" : "/dashboard"}
      owner={session.user.role === "ADMIN" ? { id: owner.id, name: owner.name, phone: owner.phoneNumber } : undefined}
      copy={messages(locale)}
      locale={locale}
    />
  );
}
