import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { convertMinor, formatMoney, minorFromInput, orderCharge, validDeliveryFee, validRate } from "./money.ts";

describe("currency conversion", () => {
    it("turns $10.00 into 895,000 LBP at the example rate and back into cents", () => {
        assert.equal(convertMinor(1000, "USD", "LBP", 89_500), 895_000);
        assert.equal(convertMinor(895_000, "LBP", "USD", 89_500), 1000);
        assert.equal(convertMinor(1000, "USD", "USD", 89_500), 1000);
    });

    it("extends a converted unit price by the quantity", () => {
        const unit = convertMinor(1000, "USD", "LBP", 89_500);
        assert.equal(unit, 895_000);
        assert.equal((unit ?? 0) * 2, 1_790_000);
    });

    it("rejects a zero, negative, or fractional rate", () => {
        assert.equal(validRate(0), false);
        assert.equal(validRate(-1), false);
        assert.equal(validRate(89_500.5), false);
        assert.equal(convertMinor(1000, "USD", "LBP", 0), null);
    });

    it("formats dollars with cents and pounds without decimals", () => {
        assert.equal(formatMoney(1000, "USD", "en"), "$10.00");
        assert.equal(formatMoney(895_000, "LBP", "en"), "895,000 LBP");
    });

    it("reads a dollar input as cents and a pound input as a whole number", () => {
        assert.equal(minorFromInput("10", "USD"), 1000);
        assert.equal(minorFromInput("10.5", "USD"), 1050);
        assert.equal(minorFromInput("10.555", "USD"), null);
        assert.equal(minorFromInput("895000", "LBP"), 895_000);
        assert.equal(minorFromInput("10.5", "LBP"), null);
    });

    it("adds a delivery fee to the product subtotal and drops a negative fee", () => {
        assert.deepEqual(orderCharge([{ unitPrice: 1000, quantity: 2 }], 500), { subtotal: 2000, deliveryFee: 500, total: 2500 });
        assert.equal(orderCharge([{ unitPrice: 1000, quantity: 1 }], 0).total, 1000);
        assert.equal(orderCharge([{ unitPrice: 1000, quantity: 1 }], -10).deliveryFee, 0);
        assert.equal(validDeliveryFee(0), true);
        assert.equal(validDeliveryFee(-1), false);
    });
});
