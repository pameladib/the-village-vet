import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { pageKey } from "@/lib/slug";

export async function revalidatePet(petId: string, visitId?: string) {
    const pet = await prisma.pet.findUnique({ where: { id: petId }, select: { id: true, slug: true } });
    const key = pet ? pageKey(pet) : petId;
    revalidatePath(`/pets/${key}`);
    revalidatePath(`/pets/${key}/edit`);
    revalidatePath(`/admin/patients/${key}`);
    if (visitId) revalidatePath(`/pets/${key}/visits/${visitId}`);
    if (key !== petId) {
        revalidatePath(`/pets/${petId}`);
        revalidatePath(`/admin/patients/${petId}`);
        if (visitId) revalidatePath(`/pets/${petId}/visits/${visitId}`);
    }
}

export async function revalidateProduct(productId: string) {
    const product = await prisma.product.findUnique({ where: { id: productId }, select: { id: true, slug: true } });
    revalidatePath("/admin/shop");
    revalidatePath("/admin/inventory");
    revalidatePath("/shop");
    if (!product) {
        revalidatePath(`/shop/${productId}`);
        return;
    }
    const key = pageKey(product);
    revalidatePath(`/shop/${key}`);
    revalidatePath(`/admin/shop/${key}`);
    revalidatePath(`/admin/inventory/${key}`);
    if (key !== productId) {
        revalidatePath(`/shop/${productId}`);
        revalidatePath(`/admin/shop/${productId}`);
        revalidatePath(`/admin/inventory/${productId}`);
    }
}
