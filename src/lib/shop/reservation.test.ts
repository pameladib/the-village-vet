import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { planReservation } from "./reservation.ts";

const products = [
    { id: "food", productId: "kibble", stock: 2, available: true, price: 1000, label: "3 kg", labelAr: "٣ كغ" },
    { id: "toy", productId: "rope", stock: 0, available: true, price: 500, label: "", labelAr: "" },
];

describe("shop reservation", () => {
    it("refuses a quantity the shelf does not have", () => {
        assert.equal(planReservation(products, [{ variantId: "food", quantity: 3 }]).ok, false);
    });

    it("counts two lines for the same version together", () => {
        assert.equal(planReservation(products, [
            { variantId: "food", quantity: 1 },
            { variantId: "food", quantity: 2 },
        ]).ok, false);
    });

    it("refuses a hidden product at public checkout and allows it for staff when stock remains", () => {
        const hidden = [{ id: "food", productId: "kibble", stock: 2, available: false, price: 1000, label: "", labelAr: "" }];
        assert.equal(planReservation(hidden, [{ variantId: "food", quantity: 1 }]).ok, false);
        const staff = planReservation(hidden, [{ variantId: "food", quantity: 1 }], { allowHidden: true });
        assert.equal(staff.ok, true);
    });

    it("keeps the price and the version label from the row", () => {
        const plan = planReservation(products, [{ variantId: "food", quantity: 2 }]);
        assert.equal(plan.ok, true);
        if (plan.ok) {
            assert.equal(plan.lines[0]?.unitPrice, 1000);
            assert.equal(plan.lines[0]?.variantLabel, "3 kg");
            assert.equal(plan.lines[0]?.productId, "kibble");
        }
    });
});
