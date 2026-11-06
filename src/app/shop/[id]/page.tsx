import Link from "next/link";
import { notFound } from "next/navigation";
import AddToCartButton from "@/components/shop/AddToCartButton";
import { prisma } from "@/lib/prisma";

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const product = await prisma.product.findFirst({
        where: { id, available: true },
        include: { category: { select: { name: true } } },
    });
    if (!product) notFound();

    return (
        <main className="mx-auto w-full max-w-lg flex-1 px-4 py-8">
            <Link href="/shop" className="text-sm text-emerald-800">Shop</Link>
            <p className="mt-4 text-xs uppercase tracking-wide text-stone-500">{product.category.name}</p>
            <h1 className="mt-1 text-2xl font-semibold">{product.name}</h1>
            {product.description && <p className="mt-2 text-sm text-stone-700">{product.description}</p>}
            <p className="mt-3 text-sm">{product.price} LBP</p>
            <AddToCartButton productId={product.id} name={product.name} price={product.price} stock={product.stock} />
        </main>
    );
}
