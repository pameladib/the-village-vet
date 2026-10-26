import type { PetGetPayload, PetSelect } from "../../../generated/prisma/models/Pet";

export const petCardSelect = {
    id: true,
    name: true,
    photoUrl: true,
} as const satisfies PetSelect;

export type PetCardData = PetGetPayload<{ select: typeof petCardSelect }>;