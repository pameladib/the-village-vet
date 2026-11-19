import type { Copy, Locale } from "@/lib/i18n";
import { formatLbp, orderFulfillmentLabel, orderPaymentLabel, shortOrderId } from "@/lib/shop/catalog";
import { formatStored, orderCharge } from "@/lib/shop/money";
import { isDelivery } from "@/lib/shop/lifecycle";

export type ReceiptSource = {
    id: string;
    status: string;
    fulfillment: string;
    payment: string;
    currency: string;
    paid: boolean;
    createdAt: Date;
    deliveryAddress: string | null;
    deliveryPhone: string | null;
    deliveryNote: string | null;
    deliveryFee: number;
    ownerName: string;
    ownerPhone: string;
    items: { name: string; fallbackName: string; quantity: number; unitPrice: number }[];
    clinicAddress: string | null;
    clinicPhone: string | null;
    clinicEmail: string | null;
};

type ReceiptLine = {
    name: string;
    quantity: string;
    unit: string;
    subtotal: string;
    plain: string;
};

export type ReceiptDocument = {
    dir: "rtl" | "ltr";
    locale: Locale;
    reference: string;
    filename: string;
    placed: string;
    clinicName: string;
    clinicLines: string[];
    customerName: string;
    customerPhone: string;
    lines: ReceiptLine[];
    subtotal: string;
    deliveryFee: string | null;
    total: string;
    plainSubtotal: string;
    plainDeliveryFee: string | null;
    plainTotal: string;
    fulfillment: string;
    fulfillmentDetails: { label: string; value: string }[];
    paymentMethod: string;
    paymentStatus: string;
    labels: {
        title: string;
        reference: string;
        placed: string;
        customer: string;
        phone: string;
        items: string;
        quantity: string;
        unit: string;
        subtotal: string;
        deliveryFee: string;
        total: string;
        fulfillment: string;
        payment: string;
        paymentStatus: string;
        disclaimer: string;
    };
    plain: {
        title: string;
        reference: string;
        placed: string;
        placedValue: string;
        customer: string;
        phone: string;
        items: string;
        subtotal: string;
        deliveryFee: string;
        total: string;
        fulfillment: string;
        fulfillmentValue: string;
        payment: string;
        paymentValue: string;
        paymentStatus: string;
        paymentStatusValue: string;
        disclaimer: string;
        details: string[];
    };
};

function when(date: Date, locale: Locale) {
    return new Intl.DateTimeFormat(locale === "ar" ? "ar-u-nu-arab" : "en-GB", {
        timeZone: "Asia/Beirut",
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
    }).format(date);
}

export function buildReceipt(order: ReceiptSource, locale: Locale, copy: Copy, english: Copy): ReceiptDocument {
    const money = (amount: number, language: Locale) => formatStored(amount, order.currency, language);
    const charge = orderCharge(order.items, order.deliveryFee);
    const delivery = isDelivery(order.fulfillment);
    const paid = order.paid;
    const clinicLines = [order.clinicAddress, order.clinicPhone, order.clinicEmail].filter((line): line is string => Boolean(line?.trim()));
    const fulfillmentDetails = delivery
        ? [
            order.deliveryAddress ? { label: copy.shopDeliveryAddress, value: order.deliveryAddress } : null,
            order.deliveryPhone ? { label: copy.shopDeliveryPhone, value: order.deliveryPhone } : null,
            order.deliveryNote ? { label: copy.shopDeliveryNote, value: order.deliveryNote } : null,
        ].filter((row): row is { label: string; value: string } => row !== null)
        : [
            { label: copy.shopPickupPlace, value: order.clinicAddress || copy.shopPickupAtClinic },
            { label: copy.shopDeliveryPhone, value: order.ownerPhone },
        ];
    const plainDetails = delivery
        ? [
            order.deliveryAddress ? `${english.shopDeliveryAddress}  ${order.deliveryAddress}` : null,
            order.deliveryPhone ? `${english.shopDeliveryPhone}  ${order.deliveryPhone}` : null,
            order.deliveryNote ? `${english.shopDeliveryNote}  ${order.deliveryNote}` : null,
        ].filter((row): row is string => row !== null)
        : [
            `${english.shopPickupPlace}  ${order.clinicAddress || english.shopPickupAtClinic}`,
            `${english.shopDeliveryPhone}  ${order.ownerPhone}`,
        ];
    const reference = shortOrderId(order.id);
    return {
        dir: locale === "ar" ? "rtl" : "ltr",
        locale,
        reference,
        filename: `village-vet-${reference}.pdf`,
        placed: when(order.createdAt, locale),
        clinicName: copy.clinicName,
        clinicLines,
        customerName: order.ownerName,
        customerPhone: order.ownerPhone,
        lines: order.items.map((item) => ({
            name: item.name,
            quantity: formatLbp(item.quantity, locale),
            unit: money(item.unitPrice, locale),
            subtotal: money(item.unitPrice * item.quantity, locale),
            plain: `${formatLbp(item.quantity, "en")}  ${item.fallbackName}  ${money(item.unitPrice, "en")}  ${money(item.unitPrice * item.quantity, "en")}`,
        })),
        subtotal: money(charge.subtotal, locale),
        deliveryFee: delivery ? money(charge.deliveryFee, locale) : null,
        total: money(charge.total, locale),
        plainSubtotal: money(charge.subtotal, "en"),
        plainDeliveryFee: delivery ? money(charge.deliveryFee, "en") : null,
        plainTotal: money(charge.total, "en"),
        fulfillment: orderFulfillmentLabel(order.fulfillment, copy),
        fulfillmentDetails,
        paymentMethod: orderPaymentLabel(order.payment, copy),
        paymentStatus: paid ? copy.shopPayPaid : copy.shopPayUnpaid,
        labels: {
            title: copy.shopReceiptTitle,
            reference: copy.shopColOrder,
            placed: copy.shopStepPlaced,
            customer: copy.shopColCustomer,
            phone: copy.phone,
            items: copy.shopColItems,
            quantity: copy.shopQty,
            unit: copy.shopUnitPrice,
            subtotal: copy.shopSubtotal,
            deliveryFee: copy.shopDeliveryFee,
            total: copy.shopTotal,
            fulfillment: copy.shopColFulfilment,
            payment: copy.shopPayment,
            paymentStatus: copy.shopPayStatus,
            disclaimer: paid ? copy.shopReceiptRecorded : copy.shopReceiptNotProof,
        },
        plain: {
            title: english.shopReceiptTitle,
            reference: english.shopColOrder,
            placed: english.shopStepPlaced,
            placedValue: when(order.createdAt, "en"),
            customer: english.shopColCustomer,
            phone: english.phone,
            items: english.shopColItems,
            subtotal: english.shopSubtotal,
            deliveryFee: english.shopDeliveryFee,
            total: english.shopTotal,
            fulfillment: english.shopColFulfilment,
            fulfillmentValue: orderFulfillmentLabel(order.fulfillment, english),
            payment: english.shopPayment,
            paymentValue: orderPaymentLabel(order.payment, english),
            paymentStatus: english.shopPayStatus,
            paymentStatusValue: paid ? english.shopPayPaid : english.shopPayUnpaid,
            disclaimer: paid ? english.shopReceiptRecorded : english.shopReceiptNotProof,
            details: plainDetails,
        },
    };
}

function escapeHtml(value: string) {
    return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

export function receiptHtml(receipt: ReceiptDocument) {
    const rows = receipt.lines.map((line) => `
        <tr>
            <td>${escapeHtml(line.name)}</td>
            <td>${escapeHtml(line.quantity)}</td>
            <td>${escapeHtml(line.unit)}</td>
            <td>${escapeHtml(line.subtotal)}</td>
        </tr>`).join("");
    const details = receipt.fulfillmentDetails.map((row) => `<p><span>${escapeHtml(row.label)}</span> ${escapeHtml(row.value)}</p>`).join("");
    const clinic = receipt.clinicLines.map((line) => `<p>${escapeHtml(line)}</p>`).join("");
    return `<!doctype html>
<html lang="${receipt.locale}" dir="${receipt.dir}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(receipt.labels.title)} ${escapeHtml(receipt.reference)}</title>
<style>
  body { margin: 0; background: #f6f1e8; color: #1c1917; font: 16px/1.5 Arial, Helvetica, sans-serif; }
  main { max-width: 42rem; margin: 0 auto; padding: 1.5rem 1rem 2rem; }
  article { background: #fff; border: 1px solid #e5e7eb; border-radius: 1rem; padding: 1.25rem; }
  h1 { margin: 0; color: #064e3b; font-size: 1.5rem; }
  h2 { margin: 1.25rem 0 0.4rem; color: #064e3b; font-size: 0.95rem; }
  p { margin: 0.15rem 0; }
  .muted { color: #78716c; font-size: 0.85rem; }
  .note { margin-top: 1rem; padding: 0.75rem 0.9rem; background: #fafaf9; border-radius: 0.75rem; color: #44403c; }
  table { width: 100%; border-collapse: collapse; margin-top: 0.5rem; }
  th, td { text-align: start; padding: 0.45rem 0.3rem; border-top: 1px solid #e5e7eb; vertical-align: top; }
  th { color: #78716c; font-size: 0.75rem; font-weight: 600; }
  .totals { margin-top: 0.75rem; }
  .totals div { display: flex; justify-content: space-between; gap: 1rem; }
  .totals .grand { font-weight: 700; color: #064e3b; }
  @media (max-width: 640px) { table { font-size: 0.9rem; } th, td { padding-inline: 0.2rem; } }
</style>
</head>
<body>
<main>
<article>
  <p class="muted">${escapeHtml(receipt.clinicName)}</p>
  ${clinic}
  <h1>${escapeHtml(receipt.labels.title)}</h1>
  <p>${escapeHtml(receipt.labels.reference)} ${escapeHtml(receipt.reference)}</p>
  <p class="muted">${escapeHtml(receipt.labels.placed)} · ${escapeHtml(receipt.placed)}</p>
  <h2>${escapeHtml(receipt.labels.customer)}</h2>
  <p>${escapeHtml(receipt.customerName)}</p>
  <p>${escapeHtml(receipt.labels.phone)} ${escapeHtml(receipt.customerPhone)}</p>
  <h2>${escapeHtml(receipt.labels.items)}</h2>
  <div style="overflow-x:auto">
  <table>
    <thead><tr><th>${escapeHtml(receipt.labels.items)}</th><th>${escapeHtml(receipt.labels.quantity)}</th><th>${escapeHtml(receipt.labels.unit)}</th><th>${escapeHtml(receipt.labels.subtotal)}</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  </div>
  <div class="totals">
    <div><span>${escapeHtml(receipt.labels.subtotal)}</span><span>${escapeHtml(receipt.subtotal)}</span></div>
    ${receipt.deliveryFee ? `<div><span>${escapeHtml(receipt.labels.deliveryFee)}</span><span>${escapeHtml(receipt.deliveryFee)}</span></div>` : ""}
    <div class="grand"><span>${escapeHtml(receipt.labels.total)}</span><span>${escapeHtml(receipt.total)}</span></div>
  </div>
  <h2>${escapeHtml(receipt.labels.fulfillment)}</h2>
  <p>${escapeHtml(receipt.fulfillment)}</p>
  ${details}
  <h2>${escapeHtml(receipt.labels.payment)}</h2>
  <p>${escapeHtml(receipt.labels.payment)} ${escapeHtml(receipt.paymentMethod)}</p>
  <p>${escapeHtml(receipt.labels.paymentStatus)} ${escapeHtml(receipt.paymentStatus)}</p>
  <p class="note">${escapeHtml(receipt.labels.disclaimer)}</p>
</article>
</main>
</body>
</html>`;
}

function pdfText(value: string, fallback: string) {
    const latin = (text: string) => [...text].every((char) => char.charCodeAt(0) <= 255);
    const source = latin(value) ? value : fallback;
    const drawable = [...source].map((char) => (char.charCodeAt(0) <= 255 ? char : "?")).join("");
    return drawable.replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)");
}

export function receiptPdf(receipt: ReceiptDocument) {
    const plain = receipt.plain;
    const lines = [
        pdfText(receipt.clinicName, "The Village Vet"),
        ...receipt.clinicLines.map((line) => pdfText(line, line)),
        "",
        pdfText(receipt.labels.title, plain.title),
        pdfText(`${receipt.labels.reference} ${receipt.reference}`, `${plain.reference} ${receipt.reference}`),
        pdfText(`${receipt.labels.placed} ${receipt.placed}`, `${plain.placed} ${plain.placedValue}`),
        "",
        pdfText(receipt.labels.customer, plain.customer),
        pdfText(receipt.customerName, receipt.customerName),
        pdfText(`${receipt.labels.phone} ${receipt.customerPhone}`, `${plain.phone} ${receipt.customerPhone}`),
        "",
        pdfText(receipt.labels.items, plain.items),
        ...receipt.lines.map((line) => pdfText(`${line.quantity}  ${line.name}  ${line.unit}  ${line.subtotal}`, line.plain)),
        "",
        pdfText(`${receipt.labels.subtotal}  ${receipt.subtotal}`, `${plain.subtotal}  ${receipt.plainSubtotal}`),
        ...(receipt.deliveryFee ? [pdfText(`${receipt.labels.deliveryFee}  ${receipt.deliveryFee}`, `${plain.deliveryFee}  ${receipt.plainDeliveryFee ?? ""}`)] : []),
        pdfText(`${receipt.labels.total}  ${receipt.total}`, `${plain.total}  ${receipt.plainTotal}`),
        "",
        pdfText(receipt.labels.fulfillment, plain.fulfillment),
        pdfText(receipt.fulfillment, plain.fulfillmentValue),
        ...receipt.fulfillmentDetails.map((detail, index) => pdfText(`${detail.label}  ${detail.value}`, plain.details[index] ?? `${detail.label}  ${detail.value}`)),
        "",
        pdfText(`${receipt.labels.payment}  ${receipt.paymentMethod}`, `${plain.payment}  ${plain.paymentValue}`),
        pdfText(`${receipt.labels.paymentStatus}  ${receipt.paymentStatus}`, `${plain.paymentStatus}  ${plain.paymentStatusValue}`),
        "",
        pdfText(receipt.labels.disclaimer, plain.disclaimer),
    ];
    return encodePdf(lines);
}

function encodePdf(lines: string[]) {
    const pages: string[][] = [];
    for (let index = 0; index < lines.length; index += 42) pages.push(lines.slice(index, index + 42));
    const objects = new Map<number, string>();
    objects.set(4, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
    const pageIds: number[] = [];
    let id = 5;
    for (const page of pages) {
        const contentId = id++;
        const pageId = id++;
        pageIds.push(pageId);
        const commands = ["BT", "/F1 11 Tf", "14 TL", "48 800 Td"];
        page.forEach((line, index) => {
            if (index > 0) commands.push("T*");
            commands.push(`(${line}) Tj`);
        });
        commands.push("ET");
        const stream = commands.join("\n");
        objects.set(contentId, `<< /Length ${Buffer.byteLength(stream)} >> stream\n${stream}\nendstream`);
        objects.set(pageId, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents ${contentId} 0 R /Resources << /Font << /F1 4 0 R >> >> >>`);
    }
    objects.set(1, "<< /Type /Catalog /Pages 2 0 R >>");
    objects.set(2, `<< /Type /Pages /Kids [${pageIds.map((pageId) => `${pageId} 0 R`).join(" ")}] /Count ${pageIds.length} >>`);
    const max = Math.max(...objects.keys());
    let body = "%PDF-1.4\n";
    const offsets = [0];
    for (let number = 1; number <= max; number += 1) {
        offsets[number] = Buffer.byteLength(body);
        body += `${number} 0 obj ${objects.get(number) ?? "<< >>"} endobj\n`;
    }
    const xref = Buffer.byteLength(body);
    body += `xref\n0 ${max + 1}\n`;
    body += "0000000000 65535 f \n";
    for (let number = 1; number <= max; number += 1) body += `${String(offsets[number]).padStart(10, "0")} 00000 n \n`;
    body += `trailer << /Size ${max + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
    return Buffer.from(body);
}
