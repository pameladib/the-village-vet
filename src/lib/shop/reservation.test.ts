import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { planReservation } from "./reservation.ts";

const products = [
    { id: "food", stock: 2, available: true, price: 1000 },
    { id: "toy", stock: 0, available: true, price: 500 },
];

describe("shop reservation", () => {
    it("refuses a quantity the shelf does not have", () => {
        assert.equal(planReservation(products, [{ productId: "food", quantity: 3 }]).ok, false);
    });

    it("counts two lines for the same product together", () => {
        assert.equal(planReservation(products, [
            { productId: "food", quantity: 1 },
            { productId: "food", quantity: 2 },
        ]).ok, false);
    });

    it("refuses a hidden product at public checkout and allows it for staff when stock remains", () => {
        const hidden = [{ id: "food", stock: 2, available: false, price: 1000 }];
        assert.equal(planReservation(hidden, [{ productId: "food", quantity: 1 }]).ok, false);
        const staff = planReservation(hidden, [{ productId: "food", quantity: 1 }], { allowHidden: true });
        assert.equal(staff.ok, true);
    });

    it("keeps the price from the product row", () => {
        const plan = planReservation(products, [{ productId: "food", quantity: 2 }]);
        assert.equal(plan.ok, true);
        if (plan.ok) assert.equal(plan.lines[0]?.unitPrice, 1000);
    });
});
