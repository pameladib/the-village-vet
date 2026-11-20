import { prisma } from "../src/lib/prisma";
import { slugify } from "../src/lib/slug";

async function fill(kind: "pet" | "product") {
    const rows = kind === "pet"
        ? await prisma.pet.findMany({ select: { id: true, name: true, slug: true }, orderBy: { id: "asc" } })
        : await prisma.product.findMany({ select: { id: true, name: true, slug: true }, orderBy: { id: "asc" } });
    const used = new Set(rows.flatMap((row) => row.slug ? [row.slug] : []));
    let filled = 0;
    for (const row of rows) {
        if (row.slug) continue;
        const base = slugify(row.name, kind);
        let slug = base;
        let n = 2;
        while (used.has(slug)) {
            slug = `${base}-${n}`;
            n += 1;
        }
        used.add(slug);
        if (kind === "pet") await prisma.pet.update({ where: { id: row.id }, data: { slug } });
        else await prisma.product.update({ where: { id: row.id }, data: { slug } });
        filled += 1;
    }
    console.log(`${kind}: ${filled} named, ${rows.length} total`);
}

await fill("pet");
await fill("product");
await prisma.$disconnect();
