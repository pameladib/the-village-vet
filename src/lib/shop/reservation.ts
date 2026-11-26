export type StockedVariant = {
    id: string;
    productId: string;
    stock: number;
    available: boolean;
    price: number;
    label: string;
    labelAr: string;
};

export type ReservationLine = {
    productId: string;
    variantId: string;
    variantLabel: string;
    variantLabelAr: string;
    quantity: number;
    unitPrice: number;
};

// Copies stock so a second line for the same version cannot reserve more than is on the shelf.
export function planReservation(
    variants: StockedVariant[],
    items: { variantId: string; quantity: number }[],
    options?: { allowHidden?: boolean },
) {
    const remaining = new Map(variants.map((variant) => [variant.id, { ...variant }]));
    const lines: ReservationLine[] = [];

    for (const item of items) {
        const variant = remaining.get(item.variantId);
        const hidden = !options?.allowHidden && !variant?.available;
        if (!variant || hidden || item.quantity < 1 || variant.stock < item.quantity) {
            return { ok: false as const };
        }
        variant.stock -= item.quantity;
        lines.push({
            productId: variant.productId,
            variantId: variant.id,
            variantLabel: variant.label,
            variantLabelAr: variant.labelAr,
            quantity: item.quantity,
            unitPrice: variant.price,
        });
    }

    return { ok: true as const, lines };
}
