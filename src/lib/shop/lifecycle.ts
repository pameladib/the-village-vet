export const orderStatuses = ["PENDING", "APPROVED", "PREPARING", "OUT_FOR_DELIVERY", "READY_FOR_PICKUP", "REJECTED", "CANCELLED", "FULFILLED"] as const;

export type OrderStatus = (typeof orderStatuses)[number];

export type ProgressStage = "PENDING" | "APPROVED" | "OUT_FOR_DELIVERY" | "READY_FOR_PICKUP" | "FULFILLED";

export type StageState = "complete" | "current" | "upcoming";

const releaseStatuses = new Set(["REJECTED", "CANCELLED"]);

export function isDelivery(fulfillment: string) {
    return fulfillment === "DELIVERY";
}

// Older rows used PREPARING after approval. That step is gone, and those orders stay accepted.
export function displayedStatus(status: string) {
    return status === "PREPARING" ? "APPROVED" : status;
}

export function customerCanCancel(status: string) {
    return status === "PENDING";
}

export function canSeeOrder(role: string, userId: string, ownerId: string | null) {
    if (role === "ADMIN" || role === "SECONDARY_ADMIN") return true;
    return role === "OWNER" && ownerId != null && userId === ownerId;
}

export type OrderOrigin = "customer" | "counter" | "staff";

export function orderOrigin(order: { createdById: string | null; approvedAt: Date | null; completedAt: Date | null }): OrderOrigin {
    if (!order.createdById) return "customer";
    if (order.completedAt && !order.approvedAt) return "counter";
    return "staff";
}

export function showsProgress(status: string, origin: OrderOrigin = "customer") {
    if (status === "REJECTED" || status === "CANCELLED") return false;
    if (origin === "counter") return false;
    return true;
}

export function progressStages(fulfillment: string, staffCreated = false): ProgressStage[] {
    const stages: ProgressStage[] = isDelivery(fulfillment)
        ? ["PENDING", "APPROVED", "OUT_FOR_DELIVERY", "FULFILLED"]
        : ["PENDING", "APPROVED", "READY_FOR_PICKUP", "FULFILLED"];
    return staffCreated ? stages.filter((stage) => stage !== "PENDING") : stages;
}

export function stageState(status: string, stage: ProgressStage, fulfillment: string, staffCreated = false): StageState {
    const stages = progressStages(fulfillment, staffCreated);
    const current = displayedStatus(status);
    if (current === "FULFILLED") return "complete";
    const currentIndex = stages.indexOf(current as ProgressStage);
    const index = stages.indexOf(stage);
    if (currentIndex < 0 || index < 0) return "upcoming";
    if (index < currentIndex) return "complete";
    if (index === currentIndex) return "current";
    return "upcoming";
}

export type AdminMove = {
    to: "APPROVED" | "REJECTED" | "OUT_FOR_DELIVERY" | "READY_FOR_PICKUP" | "FULFILLED";
    from: OrderStatus[];
};

// The only legal staff moves. A second request for the same move finds a different status and does nothing.
export function adminMoves(status: string, fulfillment: string): AdminMove[] {
    if (status === "PENDING") {
        return [
            { to: "APPROVED", from: ["PENDING"] },
            { to: "REJECTED", from: ["PENDING"] },
        ];
    }
    if (status === "APPROVED" || status === "PREPARING") {
        return isDelivery(fulfillment)
            ? [{ to: "OUT_FOR_DELIVERY", from: ["APPROVED", "PREPARING"] }]
            : [{ to: "READY_FOR_PICKUP", from: ["APPROVED", "PREPARING"] }];
    }
    if (status === "OUT_FOR_DELIVERY" && isDelivery(fulfillment)) {
        return [{ to: "FULFILLED", from: ["OUT_FOR_DELIVERY"] }];
    }
    if (status === "READY_FOR_PICKUP" && !isDelivery(fulfillment)) {
        return [{ to: "FULFILLED", from: ["READY_FOR_PICKUP"] }];
    }
    return [];
}

// Staff may undo their own order before it leaves, and an immediate counter sale recorded by mistake.
// A completed customer order stays completed.
export function staffCanCancel(order: {
    createdById: string | null;
    status: string;
    approvedAt: Date | null;
    outForDeliveryAt: Date | null;
    readyForPickupAt: Date | null;
}) {
    if (!order.createdById) return false;
    if (order.status === "APPROVED" || order.status === "PREPARING" || order.status === "READY_FOR_PICKUP") return true;
    return order.status === "FULFILLED" && !order.approvedAt && !order.outForDeliveryAt && !order.readyForPickupAt;
}

export function orderContact(order: { customerName: string; customerPhone: string }, walkIn: string) {
    return {
        name: order.customerName.trim() || walkIn,
        phone: order.customerPhone.trim(),
    };
}

export function stockEffect(next: string) {
    return releaseStatuses.has(next) ? "release" as const : "keep" as const;
}

export function stageStamp(next: string) {
    if (next === "APPROVED") return "approvedAt" as const;
    if (next === "OUT_FOR_DELIVERY") return "outForDeliveryAt" as const;
    if (next === "READY_FOR_PICKUP") return "readyForPickupAt" as const;
    if (next === "FULFILLED") return "completedAt" as const;
    if (next === "REJECTED") return "rejectedAt" as const;
    if (next === "CANCELLED") return "cancelledAt" as const;
    return null;
}
