import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { productDraftErrors, productIssueCode } from "./product-form.ts";

const categoryId = "11111111-1111-4111-8111-111111111111";

describe("product form errors", () => {
    it("names the field that is too long or missing", () => {
        const errors = productDraftErrors({
            name: "Happy Cat",
            nameAr: "",
            description: "a".repeat(501),
            descriptionAr: "ب".repeat(501),
            variants: [{ label: "", labelAr: "", price: "1.49", stock: "10" }],
            categoryId,
            hasPhoto: true,
        }, "USD");
        assert.equal(errors.name, undefined);
        assert.equal(errors.nameAr, "required");
        assert.equal(errors.description, undefined);
        assert.equal(errors.descriptionAr, undefined);
        assert.equal(errors.variants, undefined);
        const editing = productDraftErrors({
            name: "Happy Cat",
            nameAr: "قط",
            description: "",
            descriptionAr: "",
            variants: [{ label: "", labelAr: "", price: "1.49" }],
            categoryId,
            hasPhoto: true,
        }, "USD");
        assert.equal(editing.variants, undefined);
    });

    it("rejects a price or stock that cannot be saved", () => {
        const price = productDraftErrors({
            name: "Food",
            nameAr: "طعام",
            description: "",
            descriptionAr: "",
            variants: [{ label: "", labelAr: "", price: "1.499", stock: "10" }],
            categoryId: "cat-food",
            hasPhoto: false,
        }, "USD");
        assert.equal(price.variants, "price");
        assert.equal(price.categoryId, "category");
        assert.equal(price.photoUrl, "photo");
        const stock = productDraftErrors({
            name: "Food",
            nameAr: "طعام",
            description: "",
            descriptionAr: "",
            variants: [{ label: "", labelAr: "", price: "1.49", stock: "10.5" }],
            categoryId,
            hasPhoto: true,
        }, "USD");
        assert.equal(stock.variants, "stock");
    });

    it("asks for a name on every version when there is more than one", () => {
        const errors = productDraftErrors({
            name: "Food",
            nameAr: "طعام",
            description: "",
            descriptionAr: "",
            variants: [
                { label: "3 kg", labelAr: "٣ كغ", price: "4", stock: "2" },
                { label: "", labelAr: "", price: "8", stock: "1" },
            ],
            categoryId,
            hasPhoto: true,
        }, "USD");
        assert.equal(errors.variants, "label");
    });

    it("maps a server validation code back to the same field", () => {
        assert.equal(productIssueCode("descriptionAr", "too_big"), null);
        assert.equal(productIssueCode("name", "too_small"), "required");
        assert.equal(productIssueCode("variants", "too_small"), "required");
    });
});
