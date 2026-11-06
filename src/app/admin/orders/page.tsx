import Link from "next/link";
import { redirect } from "next/navigation";
import { OrderActions } from "@/components/shop/ShopAdmin";
import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export default async function AdminOrdersPage() {
    try {
        await requireRole(["ADMIN", "SECONDARY_ADMIN"]);
    } catch {
        redirect("/dashboard");
    }

    const orders = await prisma.shopOrder.findMany({
        orderBy: { createdAt: "desc" },
        take: 50,
        include: {
            owner: { select: { name: true, phoneNumber: true } },
            items: { include: { product: { select: { name: true } } } },
        },
    });

    return (
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
            <Link href="/dashboard" className="text-sm text-emerald-800">Back</Link>
            <h1 className="mt-3 text-2xl font-semibold">Shop orders</h1>
            <ul className="mt-4 flex flex-col gap-3">
                {orders.map((order) => (
                    <li key={order.id} className="rounded-2xl border border-stone-200 p-3 text-sm">
                        <p className="font-medium">{order.owner.name} · {order.owner.phoneNumber}</p>
                        <p className="text-stone-500">{order.status} · {order.payment}</p>
                        <ul className="mt-1">
                            {order.items.map((item) => (
                                <li key={item.id}>{item.product.name} × {item.quantity} · {item.unitPrice} LBP</li>
                            ))}
                        </ul>
                        <div className="mt-2"><OrderActions orderId={order.id} status={order.status} /></div>
                    </li>
                ))}
            </ul>
        </main>
    );
}
