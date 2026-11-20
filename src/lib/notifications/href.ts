const id = "([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})";

export function noticeHref(dedupeKey: string | null | undefined, audience: "staff" | "owner") {
    if (!dedupeKey) return null;
    const booked = dedupeKey.match(new RegExp(`^booked:${id}:`, "i"));
    if (booked) return audience === "staff" ? `/admin/appointments?focus=${booked[1]}` : "/dashboard";
    const cancelled = dedupeKey.match(new RegExp(`^cancelled:${id}:`, "i"));
    if (cancelled) return audience === "staff" ? `/admin/appointments?tab=cancelled&focus=${cancelled[1]}` : "/dashboard";
    const moved = dedupeKey.match(new RegExp(`^rescheduled:${id}:`, "i"));
    if (moved) return audience === "staff" ? `/admin/appointments?focus=${moved[1]}` : "/dashboard";
    const orderCancelled = dedupeKey.match(new RegExp(`^order:${id}:cancelled:`, "i"));
    if (orderCancelled) return audience === "staff" ? `/admin/orders?status=cancelled&focus=${orderCancelled[1]}` : `/shop/orders/${orderCancelled[1]}`;
    const order = dedupeKey.match(new RegExp(`^order:${id}(?::|$)`, "i"));
    if (order) return audience === "staff" ? `/admin/orders?focus=${order[1]}` : `/shop/orders/${order[1]}`;
    return null;
}
