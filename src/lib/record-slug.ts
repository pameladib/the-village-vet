import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";

// The current slug stays while the name still produces it. A renamed record gets a new one.
export async function uniqueSlug(kind: "pet" | "product", name: string, exceptId?: string) {
    const base = slugify(name, kind);
    const current = exceptId
        ? kind === "pet"
            ? await prisma.pet.findUnique({ where: { id: exceptId }, select: { name: true, slug: true } })
            : await prisma.product.findUnique({ where: { id: exceptId }, select: { name: true, slug: true } })
        : null;
    if (current?.slug && slugify(current.name, kind) === base) return current.slug;

    for (let n = 1; n < 100; n += 1) {
        const slug = n === 1 ? base : `${base}-${n}`;
        const found = kind === "pet"
            ? await prisma.pet.findUnique({ where: { slug }, select: { id: true } })
            : await prisma.product.findUnique({ where: { slug }, select: { id: true } });
        if (!found || found.id === exceptId) return slug;
    }
    return `${base}-${Date.now().toString(36)}`;
}
