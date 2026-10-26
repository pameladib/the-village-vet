import { auth } from "./auth";
import { UserRole } from "../../../generated/prisma/client";
import { prisma } from "../prisma";
import { headers } from "next/headers";

export async function requireAuth() {
    const session = await auth.api.getSession({
        headers: await headers(),
    });
    if (!session) {
        throw new Error("User is not authenticated"); // stops execution of the current function and returns an error to the caller. The caller can then handle this error appropriately, such as redirecting the user to a login page (in server components) or displaying an error message (in server actions using try...catch blocks).
    }

    return session;
}

export async function requireRole(allowedRoles: UserRole[]) {
    const session = await requireAuth();
    if (!allowedRoles.includes(session.user.role)) {
        throw new Error("User does not have the required role");
    }

    return session;
}

export async function requirePetAccess(petId: string) {
    const session = await requireAuth();
    const userId = session.user.id;

    const pet = await prisma.pet.findUnique({
        where: { id: petId },
    });

    if (!pet) {
        throw new Error("Pet not found");
    }

    if (session.user.role === "ADMIN") return pet;

    if (session.user.role !== "OWNER" || userId !== pet.ownerId) {
        throw new Error("Access Denied");
    }

    return pet;

}

