// src/app/dashboard/page.tsx
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth/auth";
import { headers } from "next/headers";
import OwnerDashboard from "@/components/dashboards/OwnerDashboard";
import { appointmentWithPetInclude } from "@/lib/types/appointments";
import { petCardSelect } from "@/lib/types/pets";

export default async function DashboardPage() {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session) {
        return;
    }

    const pets = await prisma.pet.findMany({ // query the database to get the current user's pets
        where: {
            ownerId: session.user.id,  // we got the user id using the session object
        },
        select: petCardSelect,
    });

    const appointments = await prisma.appointment.findMany({
        where: {
            ownerId: session.user.id,
        },
        orderBy: {
            startAt: "asc",
        },
        include: appointmentWithPetInclude,
    })

    const firstName = session.user.name.trim().split(/\s+/)[0]; // extracting the first name of the owner

    return (
        <OwnerDashboard pets={pets} ownerName={firstName} appointments={appointments}/>
    );
}