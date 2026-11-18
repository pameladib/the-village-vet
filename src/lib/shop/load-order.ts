import { prisma } from "@/lib/prisma";

const include = {
    owner: { select: { id: true, name: true, phoneNumber: true } },
    items: { include: { product: { select: { name: true, nameAr: true } } } },
} as const;

export async function loadOrder(id: string) {
    return prisma.shopOrder.findUnique({ where: { id }, include });
}
