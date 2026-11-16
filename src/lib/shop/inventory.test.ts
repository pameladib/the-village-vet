import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { stockLevels, stockState } from "./inventory.ts";

describe("inventory levels", () => {
    it("keeps reserved units inside the physical count", () => {
        assert.deepEqual(stockLevels(4, 3), { available: 4, reserved: 3, physical: 7 });
    });

    it("treats zero as out of stock and the threshold as low stock", () => {
        assert.equal(stockState(0, 2), "out");
        assert.equal(stockState(2, 2), "low");
        assert.equal(stockState(3, 2), "in");
    });
});
