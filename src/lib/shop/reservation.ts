export type StockedProduct = {
    id: string;
    stock: number;
    available: boolean;
    price: number;
};

export type ReservationLine = {
    productId: string;
    quantity: number;
    unitPrice: number;
};

// Copies stock so a second line for the same product cannot reserve more than is on the shelf.
export function planReservation(
    products: StockedProduct[],
    items: { productId: string; quantity: number }[],
    options?: { allowHidden?: boolean },
) {
    const remaining = new Map(products.map((product) => [product.id, { ...product }]));
    const lines: ReservationLine[] = [];

    for (const item of items) {
        const product = remaining.get(item.productId);
        const hidden = !options?.allowHidden && !product?.available;
        if (!product || hidden || item.quantity < 1 || product.stock < item.quantity) {
            return { ok: false as const };
        }
        product.stock -= item.quantity;
        lines.push({ productId: item.productId, quantity: item.quantity, unitPrice: product.price });
    }

    return { ok: true as const, lines };
}
