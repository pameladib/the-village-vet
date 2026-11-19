import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildReceipt, receiptHtml, receiptPdf, type ReceiptCopy, type ReceiptSource } from "./receipt.ts";

const english: ReceiptCopy = {
    clinicName: "The Village Vet",
    shopClinicPickup: "Clinic pickup",
    shopDelivery: "Delivery",
    shopPickupAtClinic: "Pick up at the clinic.",
    shopDeliveryAddress: "Delivery address",
    shopDeliveryPhone: "Contact number",
    shopDeliveryNote: "Note for the clinic",
    shopPayWhish: "Whish",
    shopPayCash: "Cash",
    shopPayPaid: "Paid",
    shopPayUnpaid: "Unpaid",
    shopReceiptRecorded: "The clinic recorded this payment.",
    shopReceiptNotProof: "This is an order receipt, not proof of payment. Payment is collected when the order is handed over.",
};

function order(overrides: Partial<ReceiptSource> = {}): ReceiptSource {
    return {
        id: "288c3a84-5fe2-4a2c-a101-ef2ea8053f55",
        status: "APPROVED",
        fulfillment: "PICKUP",
        payment: "CASH",
        currency: "LBP",
        paid: false,
        createdAt: new Date("2026-11-19T14:05:00.000Z"),
        deliveryAddress: "Hamra, Beirut",
        deliveryPhone: "03 123 456",
        deliveryNote: "Leave at the gate",
        deliveryFee: 50_000,
        ownerName: "Pamela Dib",
        ownerPhone: "+961 76 334 233",
        items: [{ name: "Chicken kibble for adult dogs, 3 kg", quantity: 1, unitPrice: 875_000 }],
        clinicAddress: "Kfar Habou, Danniyeh",
        clinicPhone: "+961 1 234 567",
        clinicEmail: "hello@thevillagevet.example",
        ...overrides,
    };
}

describe("english receipt", () => {
    it("keeps pickup orders free of delivery fields", () => {
        const receipt = buildReceipt(order(), english);
        const html = receiptHtml(receipt);
        assert.equal(receipt.fulfillmentMethod, "Clinic pickup");
        assert.deepEqual(receipt.fulfillmentRows, [{ label: "Pickup location", value: "Kfar Habou, Danniyeh" }]);
        assert.equal(receipt.deliveryFee, null);
        assert.match(html, /lang="en"/);
        assert.match(html, /dir="ltr"/);
        assert.equal(html.includes("dir=\"rtl\""), false);
        assert.match(html, /ORDER RECEIPT/);
        assert.match(html, /#288C3A84/);
        assert.equal(html.includes("Hamra, Beirut"), false);
        assert.equal(html.includes("Leave at the gate"), false);
        assert.equal(html.includes("إيصال"), false);
        assert.equal(html.includes("This is an order receipt, not proof of payment"), false);
    });

    it("shows delivery details only for a delivery order", () => {
        const receipt = buildReceipt(order({
            fulfillment: "DELIVERY",
            paid: true,
            deliveryPhone: "+961 76 334 233",
        }), english);
        assert.equal(receipt.fulfillmentMethod, "Delivery");
        assert.equal(receipt.deliveryFee, "50,000 LBP");
        assert.equal(receipt.fulfillmentRows.some((row) => row.label === "Delivery address"), true);
        assert.equal(receipt.fulfillmentRows.some((row) => row.label === "Pickup location"), false);
        assert.equal(receipt.fulfillmentRows.some((row) => row.label === "Contact number"), false);
        assert.equal(receipt.fulfillmentRows.some((row) => row.value === "Leave at the gate"), true);
        assert.equal(receipt.disclaimer, "The clinic recorded this payment.");
        assert.match(receiptHtml(receipt), /50,000 LBP/);
    });

    it("builds an english pdf with the same receipt title", () => {
        const pdf = receiptPdf(buildReceipt(order(), english));
        assert.equal(pdf.subarray(0, 8).toString(), "%PDF-1.4");
        assert.equal(pdf.includes(Buffer.from("ORDER RECEIPT")), true);
        assert.equal(pdf.includes(Buffer.from("/BaseFont /Helvetica-Bold")), true);
        assert.equal(pdf.includes(Buffer.from("/Subtype /Image")), true);
    });
});
