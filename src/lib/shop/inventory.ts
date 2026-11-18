// Sellable stock lives on product.stock. An open order has already taken its quantity out of that number.
// Reserved units are the order lines still in progress, so physical stock is what is left plus what is held.

export const openOrderStatuses = ["PENDING", "APPROVED", "PREPARING", "OUT_FOR_DELIVERY", "READY_FOR_PICKUP"] as const;

export type StockState = "in" | "low" | "out";

export function stockLevels(available: number, reserved: number) {
    const held = Math.max(0, reserved);
    const sellable = Math.max(0, available);
    return {
        available: sellable,
        reserved: held,
        physical: sellable + held,
    };
}

export function stockState(available: number, lowStockAt: number): StockState {
    if (available <= 0) return "out";
    if (available <= lowStockAt) return "low";
    return "in";
}
