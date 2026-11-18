import NewPetForm from "@/components/pets/new/NewPetForm";
import { requireRole } from "@/lib/auth/session";
import { getLocale, messages } from "@/lib/i18n";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export default async function NewPetPage() {
  let session;
  try {
    session = await requireRole(["OWNER"]);
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

  const petCount = await prisma.pet.count({
    where: {ownerId: session.user.id},
  });

  const isFirstPet = petCount === 0; // to display different headers based on whether this is the user's first pet or not
  const ownerName = session.user.name.trim().split(/\s+/)[0]; // getting the first name of the user to display a welcome message

  return <NewPetForm isFirstPet={isFirstPet} ownerName={ownerName} allowClinical copy={messages(await getLocale())} />;
}