import { notFound, redirect } from "next/navigation";
import OrderDetails from "@/components/shop/OrderDetails";
import { requireRole } from "@/lib/auth/session";
import { getClinicSettings } from "@/lib/clinic/public";
import { getLocale, messages } from "@/lib/i18n";
import { shopText } from "@/lib/shop/catalog";
import { orderContact } from "@/lib/shop/lifecycle";
import { loadOrder } from "@/lib/shop/load-order";

export default async function AdminOrderPage({ params }: { params: Promise<{ id: string }> }) {
    try {
        await requireRole(["ADMIN", "SECONDARY_ADMIN"]);
    } catch {
        redirect("/dashboard");
    }

    const { id } = await params;
    const [order, locale, clinic] = await Promise.all([loadOrder(id), getLocale(), getClinicSettings()]);
    if (!order) notFound();
    const copy = messages(locale);
    const contact = orderContact(order, copy.shopWalkInCustomer);

    return (
        <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
            <OrderDetails
                role="staff"
                backHref="/admin/orders"
                backLabel={copy.shopAdminOrders}
                copy={copy}
                locale={locale}
                order={{
                    id: order.id,
                    status: order.status,
                    fulfillment: order.fulfillment,
                    payment: order.payment,
                    currency: order.currency,
                    createdAt: order.createdAt,
                    approvedAt: order.approvedAt,
                    outForDeliveryAt: order.outForDeliveryAt,
                    readyForPickupAt: order.readyForPickupAt,
                    completedAt: order.completedAt,
                    rejectedAt: order.rejectedAt,
                    cancelledAt: order.cancelledAt,
                    paidAt: order.paidAt,
                    createdById: order.createdById,
                    deliveryAddress: order.deliveryAddress,
                    deliveryPhone: order.deliveryPhone,
                    deliveryNote: order.deliveryNote,
                    deliveryFee: order.deliveryFee,
                    ownerId: order.ownerId,
                    ownerName: contact.name,
                    ownerPhone: contact.phone,
                    items: order.items.map((item) => ({
                        id: item.id,
                        name: shopText(locale, item.product.name, item.product.nameAr),
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                    })),
                    clinicAddress: clinic?.address ?? null,
                    clinicPhone: clinic?.phone ?? null,
                    clinicWhatsapp: clinic?.whatsapp ?? null,
                    clinicEmail: clinic?.email ?? null,
                }}
            />
        </main>
    );
}
