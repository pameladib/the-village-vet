import Link from "next/link";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export default async function MyOrdersPage() {
    let session;
    try {
        session = await requireRole(["OWNER"]);
    } catch {
        redirect("/");
    }

    const orders = await prisma.shopOrder.findMany({
        where: { ownerId: session.user.id },
        orderBy: { createdAt: "desc" },
        include: { items: { include: { product: { select: { name: true } } } } },
    });

    return (
        <main className="mx-auto w-full max-w-lg flex-1 px-4 py-8">
            <Link href="/shop" className="text-sm text-emerald-800">Shop</Link>
            <h1 className="mt-3 text-2xl font-semibold">Your orders</h1>
            <ul className="mt-4 flex flex-col gap-3 text-sm">
                {orders.map((order) => (
                    <li key={order.id} className="rounded-2xl border border-stone-200 p-3">
                        <p className="font-medium">{order.status}</p>
                        <ul className="mt-1">
                            {order.items.map((item) => <li key={item.id}>{item.product.name} × {item.quantity}</li>)}
                        </ul>
                    </li>
                ))}
                {orders.length === 0 && <li>No orders yet.</li>}
            </ul>
        </main>
    );
}
