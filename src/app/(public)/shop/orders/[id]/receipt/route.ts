import { requireAuth } from "@/lib/auth/session";
import { getClinicSettings } from "@/lib/clinic/public";
import { getLocale, messages } from "@/lib/i18n";
import { shopText } from "@/lib/shop/catalog";
import { canSeeOrder, orderContact } from "@/lib/shop/lifecycle";
import { loadOrder } from "@/lib/shop/load-order";
import { buildReceipt, receiptHtml, receiptPdf } from "@/lib/shop/receipt";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
    const { id } = await context.params;
    let session;
    try {
        session = await requireAuth();
    } catch {
        session = null;
    }
    if (!session) return new Response("Sign in required", { status: 401, headers: { "Cache-Control": "private, no-store" } });

    const order = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id) ? await loadOrder(id) : null;
    if (!order || !canSeeOrder(session.user.role, session.user.id, order.ownerId)) {
        return new Response("Not found", { status: 404, headers: { "Cache-Control": "private, no-store" } });
    }

    const locale = await getLocale();
    const copy = messages(locale);
    const clinic = await getClinicSettings();
    const contact = orderContact(order, copy.shopWalkIn);
    const receipt = buildReceipt({
        id: order.id,
        status: order.status,
        fulfillment: order.fulfillment,
        payment: order.payment,
        currency: order.currency,
        paid: order.paidAt != null,
        createdAt: order.createdAt,
        deliveryAddress: order.deliveryAddress,
        deliveryPhone: order.deliveryPhone,
        deliveryNote: order.deliveryNote,
        ownerName: contact.name,
        ownerPhone: contact.phone,
        items: order.items.map((item) => ({
            name: shopText(locale, item.product.name, item.product.nameAr),
            fallbackName: item.product.name,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
        })),
        clinicAddress: clinic?.address ?? null,
        clinicPhone: clinic?.phone ?? null,
        clinicEmail: clinic?.email ?? null,
    }, locale, copy, messages("en"));

    const view = new URL(request.url).searchParams.get("view") === "1";
    if (view) {
        return new Response(receiptHtml(receipt), {
            headers: {
                "Content-Type": "text/html; charset=utf-8",
                "Content-Disposition": "inline",
                "Cache-Control": "private, no-store",
                "X-Content-Type-Options": "nosniff",
            },
        });
    }

    return new Response(new Uint8Array(receiptPdf(receipt)), {
        headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="${receipt.filename}"`,
            "Cache-Control": "private, no-store",
            "X-Content-Type-Options": "nosniff",
        },
    });
}
