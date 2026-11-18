import { intlLocale } from "@/lib/intl-locale";
import type { Locale } from "@/lib/i18n";

export type ShopSort = "name" | "price-asc" | "price-desc";
export type ShopStock = "any" | "in";

export type ShopQuery = {
    cat: string;
    q: string;
    sort: ShopSort;
    stock: ShopStock;
};

function isUuid(value: string | undefined): value is string {
    return !!value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function shopText(locale: Locale, en: string | null | undefined, ar: string | null | undefined) {
    if (locale === "ar" && ar?.trim()) return ar;
    return en ?? "";
}

export function parseShopQuery(input: { cat?: string; q?: string; sort?: string; stock?: string }): ShopQuery {
    const sort: ShopSort = input.sort === "price-asc" || input.sort === "price-desc" ? input.sort : "name";
    return {
        cat: isUuid(input.cat) ? input.cat : "",
        q: (input.q ?? "").trim().slice(0, 80),
        sort,
        stock: input.stock === "in" ? "in" : "any",
    };
}

export function shopHref(query: ShopQuery) {
    const params = new URLSearchParams();
    if (query.cat) params.set("cat", query.cat);
    if (query.q) params.set("q", query.q);
    if (query.sort !== "name") params.set("sort", query.sort);
    if (query.stock === "in") params.set("stock", "in");
    const search = params.toString();
    return search ? `/shop?${search}` : "/shop";
}

export function adminShopHref(cat: string, q: string) {
    const params = new URLSearchParams();
    if (cat) params.set("cat", cat);
    if (q) params.set("q", q);
    const search = params.toString();
    return search ? `/admin/shop?${search}` : "/admin/shop";
}

export function formatLbp(amount: number, locale: Locale) {
    return new Intl.NumberFormat(intlLocale(locale), { maximumFractionDigits: 0 }).format(amount);
}

export function shortOrderId(id: string) {
    return id.replace(/-/g, "").slice(0, 8).toUpperCase();
}

export function orderStatusLabel(status: string, copy: { shopStatusApproved: string; shopStatusOut: string; shopStatusReady: string; shopStatusRejected: string; shopStatusCancelled: string; shopStatusFulfilled: string; shopFilterPending: string }) {
    if (status === "APPROVED" || status === "PREPARING") return copy.shopStatusApproved;
    if (status === "OUT_FOR_DELIVERY") return copy.shopStatusOut;
    if (status === "READY_FOR_PICKUP") return copy.shopStatusReady;
    if (status === "REJECTED") return copy.shopStatusRejected;
    if (status === "CANCELLED") return copy.shopStatusCancelled;
    if (status === "FULFILLED") return copy.shopStatusFulfilled;
    return copy.shopFilterPending;
}

export function orderStatusTone(status: string) {
    if (status === "PENDING") return "bg-amber-100 text-amber-950";
    if (status === "REJECTED" || status === "CANCELLED") return "bg-stone-200 text-stone-700";
    if (status === "FULFILLED") return "bg-emerald-100 text-emerald-950";
    if (status === "OUT_FOR_DELIVERY") return "bg-sky-100 text-sky-950";
    return "bg-emerald-50 text-emerald-950";
}

export function orderFulfillmentLabel(fulfillment: string, copy: { shopPickup: string; shopDelivery: string }) {
    return fulfillment === "DELIVERY" ? copy.shopDelivery : copy.shopPickup;
}

export function orderPaymentLabel(payment: string, fulfillment: string, copy: { shopPayWhish: string; shopPayCashDelivery: string; shopPayCashPickup: string }) {
    if (payment === "WHISH") return copy.shopPayWhish;
    return fulfillment === "DELIVERY" ? copy.shopPayCashDelivery : copy.shopPayCashPickup;
}
