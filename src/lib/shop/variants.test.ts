import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { offerSummary, sellableName } from "./variants.ts";

describe("product versions", () => {
    it("keeps a single unlabeled version as the product name", () => {
        assert.equal(sellableName("Chicken kibble", ""), "Chicken kibble");
        assert.equal(sellableName("Chicken kibble", "3 kg"), "Chicken kibble · 3 kg");
    });

    it("uses the lowest price when versions differ", () => {
        assert.deepEqual(offerSummary([
            { price: 800, stock: 0 },
            { price: 400, stock: 2 },
        ]), { min: 400, from: true, stock: 2 });
        assert.equal(offerSummary([{ price: 400, stock: 2 }]).from, false);
    });
});
