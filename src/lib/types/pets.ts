import type { PetGetPayload, PetSelect } from "../../../generated/prisma/models/Pet";

export const petCardSelect = {
    id: true,
    slug: true,
    name: true,
    species: true,
    breed: true,
    photoUrl: true,
    status: true,
} as const satisfies PetSelect;

export type PetCardData = PetGetPayload<{ select: typeof petCardSelect }>;