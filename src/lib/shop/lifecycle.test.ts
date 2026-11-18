import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { adminMoves, canSeeOrder, customerCanCancel, orderOrigin, progressStages, showsProgress, staffCanCancel, stageState, stockEffect } from "./lifecycle.ts";

describe("order lifecycle", () => {
    it("lets staff approve or reject only while the order is pending", () => {
        assert.deepEqual(adminMoves("PENDING", "DELIVERY").map((move) => move.to), ["APPROVED", "REJECTED"]);
        assert.deepEqual(adminMoves("APPROVED", "DELIVERY").map((move) => move.to), ["OUT_FOR_DELIVERY"]);
        assert.deepEqual(adminMoves("APPROVED", "PICKUP").map((move) => move.to), ["READY_FOR_PICKUP"]);
        assert.deepEqual(adminMoves("OUT_FOR_DELIVERY", "DELIVERY").map((move) => move.to), ["FULFILLED"]);
        assert.deepEqual(adminMoves("READY_FOR_PICKUP", "PICKUP").map((move) => move.to), ["FULFILLED"]);
        assert.deepEqual(adminMoves("FULFILLED", "PICKUP"), []);
        assert.deepEqual(adminMoves("REJECTED", "DELIVERY"), []);
        assert.deepEqual(adminMoves("CANCELLED", "PICKUP"), []);
    });

    it("keeps a legacy preparing order on the approved step", () => {
        assert.deepEqual(adminMoves("PREPARING", "DELIVERY").map((move) => move.to), ["OUT_FOR_DELIVERY"]);
        assert.deepEqual(adminMoves("PREPARING", "PICKUP").map((move) => move.to), ["READY_FOR_PICKUP"]);
        assert.equal(stageState("PREPARING", "APPROVED", "PICKUP"), "current");
        assert.equal(stageState("PREPARING", "PENDING", "PICKUP"), "complete");
    });

    it("does not offer the other fulfillment path", () => {
        assert.equal(adminMoves("OUT_FOR_DELIVERY", "PICKUP").length, 0);
        assert.equal(adminMoves("READY_FOR_PICKUP", "DELIVERY").length, 0);
        assert.deepEqual(progressStages("DELIVERY"), ["PENDING", "APPROVED", "OUT_FOR_DELIVERY", "FULFILLED"]);
        assert.deepEqual(progressStages("PICKUP"), ["PENDING", "APPROVED", "READY_FOR_PICKUP", "FULFILLED"]);
    });

    it("marks the current stage and completes the path only when the order is finished", () => {
        assert.equal(stageState("PENDING", "PENDING", "DELIVERY"), "current");
        assert.equal(stageState("PENDING", "APPROVED", "DELIVERY"), "upcoming");
        assert.equal(stageState("APPROVED", "PENDING", "PICKUP"), "complete");
        assert.equal(stageState("APPROVED", "APPROVED", "PICKUP"), "current");
        assert.equal(stageState("OUT_FOR_DELIVERY", "OUT_FOR_DELIVERY", "DELIVERY"), "current");
        assert.equal(stageState("FULFILLED", "READY_FOR_PICKUP", "PICKUP"), "complete");
        assert.equal(showsProgress("REJECTED"), false);
        assert.equal(showsProgress("CANCELLED"), false);
        assert.equal(showsProgress("APPROVED"), true);
    });

    it("lets the customer cancel only before approval, and releases stock only when the order stops", () => {
        assert.equal(customerCanCancel("PENDING"), true);
        assert.equal(customerCanCancel("APPROVED"), false);
        assert.equal(customerCanCancel("FULFILLED"), false);
        assert.equal(stockEffect("CANCELLED"), "release");
        assert.equal(stockEffect("REJECTED"), "release");
        assert.equal(stockEffect("APPROVED"), "keep");
        assert.equal(stockEffect("FULFILLED"), "keep");
        assert.equal(stockEffect("OUT_FOR_DELIVERY"), "keep");
    });

    it("shows a receipt only to the owner and shop staff", () => {
        assert.equal(canSeeOrder("OWNER", "owner-1", "owner-1"), true);
        assert.equal(canSeeOrder("OWNER", "owner-1", "owner-2"), false);
        assert.equal(canSeeOrder("OWNER", "owner-1", null), false);
        assert.equal(canSeeOrder("ADMIN", "staff", "owner-2"), true);
        assert.equal(canSeeOrder("ADMIN", "staff", null), true);
        assert.equal(canSeeOrder("SECONDARY_ADMIN", "staff", null), true);
        assert.equal(canSeeOrder("OWNER", "staff", "owner-2"), false);
    });

    it("skips pending approval on a staff order and hides the path for a counter sale", () => {
        assert.deepEqual(progressStages("PICKUP", true), ["APPROVED", "READY_FOR_PICKUP", "FULFILLED"]);
        assert.deepEqual(progressStages("DELIVERY", true), ["APPROVED", "OUT_FOR_DELIVERY", "FULFILLED"]);
        assert.equal(stageState("APPROVED", "APPROVED", "DELIVERY", true), "current");
        assert.equal(showsProgress("FULFILLED", "counter"), false);
        assert.equal(showsProgress("APPROVED", "staff"), true);
        assert.equal(orderOrigin({ createdById: null, approvedAt: null, completedAt: null }), "customer");
        assert.equal(orderOrigin({ createdById: "staff", approvedAt: null, completedAt: new Date() }), "counter");
        assert.equal(orderOrigin({ createdById: "staff", approvedAt: new Date(), completedAt: null }), "staff");
    });

    it("lets staff cancel their own open order or a mistaken counter sale", () => {
        const staff = { createdById: "staff", approvedAt: new Date(), outForDeliveryAt: null, readyForPickupAt: null };
        assert.equal(staffCanCancel({ ...staff, status: "APPROVED" }), true);
        assert.equal(staffCanCancel({ ...staff, status: "READY_FOR_PICKUP", readyForPickupAt: new Date() }), true);
        assert.equal(staffCanCancel({ ...staff, status: "OUT_FOR_DELIVERY", outForDeliveryAt: new Date() }), false);
        assert.equal(staffCanCancel({ ...staff, status: "FULFILLED" }), false);
        assert.equal(staffCanCancel({ createdById: "staff", status: "FULFILLED", approvedAt: null, outForDeliveryAt: null, readyForPickupAt: null }), true);
        assert.equal(staffCanCancel({ createdById: null, status: "FULFILLED", approvedAt: new Date(), outForDeliveryAt: null, readyForPickupAt: new Date() }), false);
        assert.equal(staffCanCancel({ createdById: null, status: "APPROVED", approvedAt: new Date(), outForDeliveryAt: null, readyForPickupAt: null }), false);
    });
});
