import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function ShopPage() {
    const categories = await prisma.productCategory.findMany({
        orderBy: { name: "asc" },
        include: {
            products: {
                where: { available: true },
                orderBy: { name: "asc" },
            },
        },
    });

    return (
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
            <div className="flex items-center justify-between gap-3">
                <h1 className="text-2xl font-semibold">Pet shop</h1>
                <Link href="/shop/cart" className="text-sm font-medium text-emerald-800">Cart</Link>
            </div>
            <p className="mt-1 text-sm text-stone-600">Prices are in Lebanese pounds. You pay when you collect the order.</p>
            {categories.map((category) => (
                <section key={category.id} className="mt-6">
                    <h2 className="text-sm font-medium text-emerald-900">{category.name}</h2>
                    {category.products.length === 0 && <p className="mt-2 text-sm text-stone-500">Nothing in this category yet.</p>}
                    <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                        {category.products.map((product) => (
                            <li key={product.id}>
                                <Link href={`/shop/${product.id}`} className="block rounded-2xl border border-emerald-100 p-3 hover:border-emerald-700">
                                    <p className="font-medium">{product.name}</p>
                                    <p className="text-sm text-stone-500">{product.price} LBP · {product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}</p>
                                </Link>
                            </li>
                        ))}
                    </ul>
                </section>
            ))}
        </main>
    );
}
