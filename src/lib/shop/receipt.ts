import { inflateSync, deflateSync } from "node:zlib";
import { readFileSync } from "node:fs";
import path from "node:path";
import { isDelivery } from "./lifecycle";
import { formatStored, orderCharge } from "./money";

export type ReceiptCopy = {
    clinicName: string;
    shopClinicPickup: string;
    shopDelivery: string;
    shopPickupAtClinic: string;
    shopDeliveryAddress: string;
    shopDeliveryPhone: string;
    shopDeliveryNote: string;
    shopPayWhish: string;
    shopPayCash: string;
    shopPayPaid: string;
    shopPayUnpaid: string;
    shopReceiptRecorded: string;
    shopReceiptNotProof: string;
};

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
    items: { name: string; quantity: number; unitPrice: number }[];
    clinicAddress: string | null;
    clinicPhone: string | null;
    clinicEmail: string | null;
};

type ReceiptLine = {
    name: string;
    quantity: string;
    unit: string;
    amount: string;
};

export type ReceiptDocument = {
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
    fulfillmentMethod: string;
    fulfillmentRows: { label: string; value: string }[];
    paymentMethod: string;
    paymentStatus: string;
    paid: boolean;
    disclaimer: string;
};

const labels = {
    title: "ORDER RECEIPT",
    orderNumber: "Order number",
    orderDate: "Order date",
    customer: "Customer",
    phone: "Phone",
    item: "Item",
    quantity: "Quantity",
    unit: "Unit price",
    amount: "Amount",
    subtotal: "Subtotal",
    deliveryFee: "Delivery fee",
    total: "Total",
    fulfillment: "Fulfillment",
    method: "Fulfillment method",
    pickup: "Pickup location",
    payment: "Payment",
    paymentMethod: "Payment method",
    paymentStatus: "Payment status",
};

function shortOrderId(id: string) {
    return id.replace(/-/g, "").slice(0, 8).toUpperCase();
}

function quantityLabel(amount: number) {
    return new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 }).format(amount);
}

function placedOn(date: Date) {
    return new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Beirut",
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
    }).format(date);
}

function phoneDigits(value: string) {
    const digits = value.replace(/\D/g, "");
    if (digits.startsWith("00")) return digits.slice(2);
    if (digits.startsWith("0")) return `961${digits.slice(1)}`;
    return digits;
}

export function buildReceipt(order: ReceiptSource, english: ReceiptCopy): ReceiptDocument {
    const money = (amount: number) => formatStored(amount, order.currency, "en");
    const charge = orderCharge(order.items, order.deliveryFee);
    const delivery = isDelivery(order.fulfillment);
    const clinicLines = [order.clinicAddress, order.clinicPhone, order.clinicEmail].filter((line): line is string => Boolean(line?.trim()));
    const deliveryPhone = order.deliveryPhone?.trim() ?? "";
    const showDeliveryPhone = delivery && deliveryPhone.length > 0 && phoneDigits(deliveryPhone) !== phoneDigits(order.ownerPhone);
    const fulfillmentRows = delivery
        ? [
            order.deliveryAddress?.trim() ? { label: english.shopDeliveryAddress, value: order.deliveryAddress.trim() } : null,
            showDeliveryPhone ? { label: english.shopDeliveryPhone, value: deliveryPhone } : null,
            order.deliveryNote?.trim() ? { label: english.shopDeliveryNote, value: order.deliveryNote.trim() } : null,
        ].filter((row): row is { label: string; value: string } => row !== null)
        : [{ label: labels.pickup, value: order.clinicAddress?.trim() || english.shopPickupAtClinic }];
    const reference = shortOrderId(order.id);
    return {
        reference,
        filename: `village-vet-${reference}.pdf`,
        placed: placedOn(order.createdAt),
        clinicName: english.clinicName,
        clinicLines,
        customerName: order.ownerName.trim(),
        customerPhone: order.ownerPhone.trim(),
        lines: order.items.map((item) => ({
            name: item.name.trim(),
            quantity: quantityLabel(item.quantity),
            unit: money(item.unitPrice),
            amount: money(item.unitPrice * item.quantity),
        })),
        subtotal: money(charge.subtotal),
        deliveryFee: delivery ? money(charge.deliveryFee) : null,
        total: money(charge.total),
        fulfillmentMethod: delivery ? english.shopDelivery : english.shopClinicPickup,
        fulfillmentRows,
        paymentMethod: order.payment === "WHISH" ? english.shopPayWhish : english.shopPayCash,
        paymentStatus: order.paid ? english.shopPayPaid : english.shopPayUnpaid,
        paid: order.paid,
        disclaimer: order.paid ? english.shopReceiptRecorded : "",
    };
}

function escapeHtml(value: string) {
    return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

export function receiptHtml(receipt: ReceiptDocument) {
    const rows = receipt.lines.map((line) => `
        <tr>
            <td class="item">${escapeHtml(line.name)}</td>
            <td class="num">${escapeHtml(line.quantity)}</td>
            <td class="num">${escapeHtml(line.unit)}</td>
            <td class="num">${escapeHtml(line.amount)}</td>
        </tr>`).join("");
    const facts = (rowsToShow: { label: string; value: string }[]) => rowsToShow.map((row) => `
        <p><span class="k">${escapeHtml(row.label)}</span>${escapeHtml(row.value)}</p>`).join("");
    const clinic = receipt.clinicLines.map((line) => `<p>${escapeHtml(line)}</p>`).join("");
    const phone = receipt.customerPhone
        ? `<div><span>${labels.phone}</span><strong dir="ltr">${escapeHtml(receipt.customerPhone)}</strong></div>`
        : "";
    return `<!doctype html>
<html lang="en" dir="ltr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="color-scheme" content="light" />
<title>${escapeHtml(labels.title)} ${escapeHtml(receipt.reference)}</title>
<style>
  @page { size: A4; margin: 16mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; background: #f3f4f6; color: #1c1917; }
  body { font: 14px/1.45 Helvetica, Arial, sans-serif; }
  main { max-width: 760px; margin: 0 auto; padding: 28px 16px 48px; }
  article { background: #fff; padding: 36px 40px 32px; box-shadow: 0 1px 2px rgba(28, 25, 23, 0.06), 0 12px 32px rgba(28, 25, 23, 0.05); }
  .clinic { display: flex; align-items: center; gap: 16px; }
  .clinic img { width: 108px; height: auto; }
  .clinic .name { margin: 0; color: #1c1917; font-size: 17px; font-weight: 700; letter-spacing: -0.01em; }
  .clinic p { margin: 0; color: #57534e; font-size: 12.5px; }
  h1 { margin: 22px 0 0; padding-top: 14px; border-top: 1px solid #e7e5e4; font-size: 13px; font-weight: 700; letter-spacing: 0.16em; }
  .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 14px 36px; margin-top: 16px; }
  .meta span, .k { display: block; color: #78716c; font-size: 11px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; }
  .meta strong { display: block; margin-top: 2px; font-size: 14px; font-weight: 600; overflow-wrap: anywhere; }
  table { width: 100%; border-collapse: collapse; margin-top: 22px; table-layout: fixed; }
  col.item { width: 46%; }
  col.qty { width: 14%; }
  col.price { width: 20%; }
  th { padding: 0 8px 8px 0; border-bottom: 1px solid #d6d3d1; color: #78716c; font-size: 11px; font-weight: 600; letter-spacing: 0.04em; text-align: left; text-transform: uppercase; }
  td { padding: 9px 8px 9px 0; border-bottom: 1px solid #e7e5e4; vertical-align: top; font-size: 13.5px; }
  th.num, td.num { padding-right: 0; text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
  td.item { overflow-wrap: anywhere; }
  .totals { width: min(280px, 100%); margin-top: 8px; margin-left: auto; }
  .totals div { display: flex; justify-content: space-between; gap: 24px; padding: 3px 0; font-size: 13.5px; font-variant-numeric: tabular-nums; }
  .totals .grand { margin-top: 4px; padding-top: 8px; border-top: 1px solid #d6d3d1; font-size: 15px; font-weight: 700; }
  .split { display: grid; grid-template-columns: 1fr 1fr; gap: 28px; margin-top: 22px; padding-top: 16px; border-top: 1px solid #e7e5e4; }
  .split h2 { margin: 0 0 10px; font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
  .split p { margin: 0 0 10px; font-size: 13.5px; overflow-wrap: anywhere; }
  .split .paid { font-weight: 700; }
  footer { margin-top: 22px; padding-top: 12px; border-top: 1px solid #e7e5e4; color: #57534e; font-size: 11.5px; line-height: 1.5; }
  @media (max-width: 640px) {
    main { padding: 12px 10px 28px; }
    article { padding: 22px 16px 20px; }
    .clinic { align-items: flex-start; }
    .clinic img { width: 84px; }
    .meta, .split { grid-template-columns: 1fr; gap: 12px; }
    th, td { font-size: 12.5px; }
  }
  @media print {
    html, body { background: #fff; }
    main { max-width: none; padding: 0; }
    article { padding: 0; box-shadow: none; }
    .clinic, .meta, .split, .totals, footer, tr { break-inside: avoid; page-break-inside: avoid; }
  }
</style>
</head>
<body>
<main>
<article>
  <header class="clinic">
    <img src="/images/logo-mark.png" alt="${escapeHtml(receipt.clinicName)}" />
    <div>
      <p class="name">${escapeHtml(receipt.clinicName)}</p>
      ${clinic}
    </div>
  </header>
  <h1>${labels.title}</h1>
  <section class="meta">
    <div><span>${labels.orderNumber}</span><strong dir="ltr">#${escapeHtml(receipt.reference)}</strong></div>
    <div><span>${labels.orderDate}</span><strong>${escapeHtml(receipt.placed)}</strong></div>
    <div><span>${labels.customer}</span><strong>${escapeHtml(receipt.customerName)}</strong></div>
    ${phone}
  </section>
  <table>
    <colgroup><col class="item" /><col class="qty" /><col class="price" /><col class="price" /></colgroup>
    <thead>
      <tr>
        <th>${labels.item}</th>
        <th class="num">${labels.quantity}</th>
        <th class="num">${labels.unit}</th>
        <th class="num">${labels.amount}</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="totals">
    <div><span>${labels.subtotal}</span><span>${escapeHtml(receipt.subtotal)}</span></div>
    ${receipt.deliveryFee ? `<div><span>${labels.deliveryFee}</span><span>${escapeHtml(receipt.deliveryFee)}</span></div>` : ""}
    <div class="grand"><span>${labels.total}</span><span>${escapeHtml(receipt.total)}</span></div>
  </div>
  <section class="split">
    <div>
      <h2>${labels.fulfillment}</h2>
      <p><span class="k">${labels.method}</span>${escapeHtml(receipt.fulfillmentMethod)}</p>
      ${facts(receipt.fulfillmentRows)}
    </div>
    <div>
      <h2>${labels.payment}</h2>
      <p><span class="k">${labels.paymentMethod}</span>${escapeHtml(receipt.paymentMethod)}</p>
      <p><span class="k">${labels.paymentStatus}</span><span class="${receipt.paid ? "paid" : ""}">${escapeHtml(receipt.paymentStatus)}</span></p>
    </div>
  </section>
  ${receipt.disclaimer ? `<footer>${escapeHtml(receipt.disclaimer)}</footer>` : ""}
</article>
</main>
</body>
</html>`;
}

const INK = "0.110 0.098 0.090";
const MUTED = "0.345 0.325 0.306";
const RULE = "0.839 0.827 0.820";
const HAIR = "0.906 0.898 0.894";
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN_X = 48;
const TOP = 46;
const BOTTOM = 46;
const RIGHT = PAGE_W - MARGIN_X;
const CONTENT_W = RIGHT - MARGIN_X;

const HELVETICA: Record<string, number> = {};
function widths(chars: string, width: number) {
    for (const char of chars) HELVETICA[char] = width;
}
widths(" ", 278);
widths("!'.,:;`", 278);
widths("ijl", 222);
widths("|", 260);
widths("()[]{}", 334);
widths("-", 333);
widths("*", 389);
widths("^", 469);
widths("+<=>~", 584);
widths("ftr", 278);
widths("s", 500);
widths("acez", 500);
widths("bdghnopqu", 556);
widths("kvy", 500);
widths("w", 722);
widths("m", 833);
widths("I", 278);
widths("J", 500);
widths("0123456789#$", 556);
widths("?", 556);
widths("L", 556);
widths("AEFTZ", 611);
widths("BKRSUVX", 667);
widths("CDHNO", 722);
widths("GQ", 778);
widths("M", 833);
widths("W", 944);
widths("&", 667);
widths("%", 889);
widths("@", 1015);
widths("/", 278);
widths("\\", 278);
widths("_", 556);

function textWidth(value: string, size: number) {
    let units = 0;
    for (const char of value) units += HELVETICA[char] ?? 500;
    return (units / 1000) * size;
}

function pdfLiteral(value: string) {
    let out = "";
    for (const char of value) {
        const code = char.charCodeAt(0);
        const mapped = code === 0x2013 || code === 0x2014 ? 45
            : code === 0x2018 || code === 0x2019 ? 39
                : code === 0x201c || code === 0x201d ? 34
                    : code === 0x2026 ? null
                        : code === 0x00a0 ? 32
                            : code;
        if (mapped === null) {
            out += "...";
            continue;
        }
        if (mapped === 92 || mapped === 40 || mapped === 41) out += `\\${String.fromCharCode(mapped)}`;
        else if (mapped >= 32 && mapped <= 126) out += String.fromCharCode(mapped);
        else if (mapped >= 160 && mapped <= 255) out += `\\${mapped.toString(8).padStart(3, "0")}`;
        else out += "?";
    }
    return out;
}

function wrapText(value: string, size: number, maxWidth: number) {
    const words = value.split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let current = "";
    const pushLong = (word: string) => {
        let chunk = "";
        for (const char of word) {
            const trial = chunk + char;
            if (textWidth(trial, size) <= maxWidth) chunk = trial;
            else {
                if (chunk) lines.push(chunk);
                chunk = char;
            }
        }
        current = chunk;
    };
    for (const word of words) {
        const next = current ? `${current} ${word}` : word;
        if (textWidth(next, size) <= maxWidth) current = next;
        else if (!current) pushLong(word);
        else {
            lines.push(current);
            if (textWidth(word, size) <= maxWidth) current = word;
            else pushLong(word);
        }
    }
    if (current) lines.push(current);
    return lines.length > 0 ? lines : [""];
}

type Logo = { width: number; height: number; rgb: Buffer };

function decodeLogo(file: Buffer): Logo | null {
    if (file.length < 29 || file.toString("ascii", 1, 4) !== "PNG") return null;
    if (file[25] !== 6 || file[28] !== 0) return null;
    const width = file.readUInt32BE(16);
    const height = file.readUInt32BE(20);
    const parts: Buffer[] = [];
    let offset = 8;
    while (offset + 8 <= file.length) {
        const length = file.readUInt32BE(offset);
        const type = file.toString("ascii", offset + 4, offset + 8);
        const start = offset + 8;
        const end = start + length;
        if (end + 4 > file.length) return null;
        if (type === "IDAT") parts.push(file.subarray(start, end));
        offset = end + 4;
        if (type === "IEND") break;
    }
    const inflated = inflateSync(Buffer.concat(parts));
    const stride = width * 4;
    const rgba = Buffer.alloc(width * height * 4);
    let src = 0;
    let prev = Buffer.alloc(stride);
    for (let y = 0; y < height; y += 1) {
        const filter = inflated[src];
        src += 1;
        const row = Buffer.from(inflated.subarray(src, src + stride));
        src += stride;
        for (let i = 0; i < stride; i += 1) {
            const left = i >= 4 ? row[i - 4] : 0;
            const up = prev[i];
            const upLeft = i >= 4 ? prev[i - 4] : 0;
            if (filter === 1) row[i] = (row[i] + left) & 255;
            else if (filter === 2) row[i] = (row[i] + up) & 255;
            else if (filter === 3) row[i] = (row[i] + Math.floor((left + up) / 2)) & 255;
            else if (filter === 4) {
                const estimate = left + up - upLeft;
                const pa = Math.abs(estimate - left);
                const pb = Math.abs(estimate - up);
                const pc = Math.abs(estimate - upLeft);
                const predictor = pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft;
                row[i] = (row[i] + predictor) & 255;
            }
        }
        row.copy(rgba, y * stride);
        prev = row;
    }
    const targetWidth = 180;
    const targetHeight = Math.max(1, Math.round(height * targetWidth / width));
    const rgb = Buffer.alloc(targetWidth * targetHeight * 3);
    for (let y = 0; y < targetHeight; y += 1) {
        const y0 = Math.floor(y * height / targetHeight);
        const y1 = Math.max(y0 + 1, Math.floor((y + 1) * height / targetHeight));
        for (let x = 0; x < targetWidth; x += 1) {
            const x0 = Math.floor(x * width / targetWidth);
            const x1 = Math.max(x0 + 1, Math.floor((x + 1) * width / targetWidth));
            let red = 0;
            let green = 0;
            let blue = 0;
            let count = 0;
            for (let yy = y0; yy < y1; yy += 1) {
                for (let xx = x0; xx < x1; xx += 1) {
                    const index = (yy * width + xx) * 4;
                    const alpha = rgba[index + 3] / 255;
                    red += rgba[index] * alpha + 255 * (1 - alpha);
                    green += rgba[index + 1] * alpha + 255 * (1 - alpha);
                    blue += rgba[index + 2] * alpha + 255 * (1 - alpha);
                    count += 1;
                }
            }
            const dest = (y * targetWidth + x) * 3;
            rgb[dest] = Math.round(red / count);
            rgb[dest + 1] = Math.round(green / count);
            rgb[dest + 2] = Math.round(blue / count);
        }
    }
    return { width: targetWidth, height: targetHeight, rgb };
}

let cachedLogo: Logo | null | undefined;

function logoImage() {
    if (cachedLogo !== undefined) return cachedLogo;
    try {
        cachedLogo = decodeLogo(readFileSync(path.join(process.cwd(), "public/images/logo-mark.png")));
    } catch {
        cachedLogo = null;
    }
    return cachedLogo;
}

function n(value: number) {
    return value.toFixed(2);
}

class Sheet {
    private pages: string[] = [];
    private ops: string[] = [];
    private y = PAGE_H - TOP;
    private open = false;
    private receipt: ReceiptDocument;
    private logo: Logo | null;

    constructor(receipt: ReceiptDocument, logo: Logo | null) {
        this.receipt = receipt;
        this.logo = logo;
    }

    paint(text: string, x: number, baseline: number, size: number, font: "F1" | "F2", color: string) {
        this.ops.push(`BT /${font} ${size} Tf ${color} rg 1 0 0 1 ${n(x)} ${n(baseline)} Tm (${pdfLiteral(text)}) Tj ET`);
    }

    rule(y: number, color = RULE, width = 0.6) {
        this.ruleBetween(MARGIN_X, RIGHT, y, color, width);
    }

    ruleBetween(x1: number, x2: number, y: number, color = RULE, width = 0.6) {
        this.ops.push(`${color} RG ${width} w ${n(x1)} ${n(y)} m ${n(x2)} ${n(y)} l S`);
    }

    private begin(continued: boolean) {
        if (this.open) this.pages.push(this.ops.join("\n"));
        this.ops = [];
        this.open = true;
        this.y = PAGE_H - TOP;
        if (continued) {
            this.paint(this.receipt.clinicName, MARGIN_X, this.y - 9, 10, "F2", INK);
            const mark = `Order #${this.receipt.reference}`;
            this.paint(mark, RIGHT - textWidth(mark, 9), this.y - 8, 9, "F1", MUTED);
            this.y -= 16;
            this.rule(this.y);
            this.y -= 16;
        }
    }

    need(height: number) {
        if (!this.open) this.begin(false);
        if (this.y - height < BOTTOM) this.begin(true);
    }

    draw() {
        this.header();
        this.meta();
        this.table();
        this.totals();
        this.details();
        this.footer();
        if (this.open) this.pages.push(this.ops.join("\n"));
        return encodePdf(this.pages, this.logo);
    }

    private header() {
        const logoW = 108;
        const logoH = this.logo ? logoW * this.logo.height / this.logo.width : 0;
        const textX = this.logo ? MARGIN_X + logoW + 14 : MARGIN_X;
        const textW = RIGHT - textX;
        const name = wrapText(this.receipt.clinicName, 13, textW);
        const details = this.receipt.clinicLines.flatMap((line) => wrapText(line, 9, textW));
        const textH = name.length * 16 + details.length * 12;
        this.need(Math.max(logoH, textH) + 36);
        const top = this.y;
        if (this.logo) {
            this.ops.push(`q ${n(logoW)} 0 0 ${n(logoH)} ${n(MARGIN_X)} ${n(top - logoH)} cm /Im1 Do Q`);
        }
        let baseline = top - 12;
        for (const line of name) {
            this.paint(line, textX, baseline, 13, "F2", INK);
            baseline -= 16;
        }
        for (const line of details) {
            this.paint(line, textX, baseline, 9, "F1", MUTED);
            baseline -= 12;
        }
        this.y = top - Math.max(logoH, textH) - 12;
        this.rule(this.y);
        this.y -= 18;
        this.paint(labels.title, MARGIN_X, this.y, 11, "F2", INK);
        this.y -= 16;
    }

    private block(title: string, value: string, x: number, width: number, top: number) {
        const lines = wrapText(value || "—", 10.5, width);
        this.paint(title, x, top - 8, 8, "F2", MUTED);
        let baseline = top - 22;
        for (const line of lines) {
            this.paint(line, x, baseline, 10.5, "F1", INK);
            baseline -= 13;
        }
        return 22 + lines.length * 13;
    }

    private meta() {
        const column = (CONTENT_W - 28) / 2;
        const left = [
            [labels.orderNumber, `#${this.receipt.reference}`],
            [labels.customer, this.receipt.customerName || "—"],
        ] as const;
        const right: [string, string][] = [[labels.orderDate, this.receipt.placed]];
        if (this.receipt.customerPhone) right.push([labels.phone, this.receipt.customerPhone]);
        const rowHeight = (value: string) => 30 + wrapText(value || "—", 10.5, column).length * 13;
        const heightOf = (rows: readonly (readonly [string, string])[] | [string, string][]) => rows.reduce((sum, row) => sum + rowHeight(row[1]), 0);
        const height = Math.max(heightOf(left), heightOf(right));
        this.need(height + 8);
        let y = this.y;
        for (const row of left) {
            y -= this.block(row[0], row[1], MARGIN_X, column, y);
            y -= 8;
        }
        y = this.y;
        for (const row of right) {
            y -= this.block(row[0], row[1], MARGIN_X + column + 28, column, y);
            y -= 8;
        }
        this.y -= height;
        this.rule(this.y);
        this.y -= 14;
    }

    private table() {
        const amountW = 92;
        const unitW = 88;
        const qtyW = 58;
        const gap = 8;
        const amountRight = RIGHT;
        const unitRight = amountRight - amountW - gap;
        const qtyRight = unitRight - unitW - gap;
        const itemW = qtyRight - qtyW - gap - MARGIN_X;
        const head = () => {
            this.need(22);
            const baseline = this.y - 8;
            this.paint(labels.item, MARGIN_X, baseline, 8, "F2", MUTED);
            this.paint(labels.quantity, qtyRight - textWidth(labels.quantity, 8), baseline, 8, "F2", MUTED);
            this.paint(labels.unit, unitRight - textWidth(labels.unit, 8), baseline, 8, "F2", MUTED);
            this.paint(labels.amount, amountRight - textWidth(labels.amount, 8), baseline, 8, "F2", MUTED);
            this.y -= 14;
            this.rule(this.y, RULE, 0.8);
            this.y -= 11;
        };
        head();
        for (const line of this.receipt.lines) {
            const name = wrapText(line.name || "—", 10, itemW);
            const rowH = Math.max(name.length, 1) * 13 + 6;
            if (this.y - rowH < BOTTOM) {
                this.begin(true);
                head();
            }
            const first = this.y - 10;
            name.forEach((part, index) => this.paint(part, MARGIN_X, first - index * 13, 10, "F1", INK));
            this.paint(line.quantity, qtyRight - textWidth(line.quantity, 10), first, 10, "F1", INK);
            this.paint(line.unit, unitRight - textWidth(line.unit, 10), first, 10, "F1", INK);
            this.paint(line.amount, amountRight - textWidth(line.amount, 10), first, 10, "F1", INK);
            this.y -= rowH;
            this.rule(this.y + 2, HAIR, 0.4);
        }
        this.y -= 8;
    }

    private totals() {
        const rows = [
            [labels.subtotal, this.receipt.subtotal, false],
            ...(this.receipt.deliveryFee ? [[labels.deliveryFee, this.receipt.deliveryFee, false] as const] : []),
            [labels.total, this.receipt.total, true],
        ] as const;
        const height = rows.length * 16 + 8;
        this.need(height);
        for (const [label, value, strong] of rows) {
            const size = strong ? 12 : 10;
            const font = strong ? "F2" : "F1";
            const valueWidth = textWidth(value, size);
            const labelWidth = textWidth(label, size);
            const labelX = RIGHT - valueWidth - 28 - labelWidth;
            if (strong) {
                this.ruleBetween(labelX, RIGHT, this.y, RULE, 0.7);
                this.y -= 14;
            }
            this.paint(label, labelX, this.y - size, size, font, INK);
            this.paint(value, RIGHT - valueWidth, this.y - size, size, font, INK);
            this.y -= strong ? 18 : 15;
        }
    }

    private stackHeight(rows: { label: string; value: string }[], width: number) {
        return rows.reduce((sum, row) => sum + 12 + wrapText(row.value, 10, width).length * 13 + 6, 0);
    }

    private stack(rows: { label: string; value: string }[], x: number, width: number, top: number) {
        let y = top;
        for (const row of rows) {
            this.paint(row.label, x, y - 8, 8, "F2", MUTED);
            const lines = wrapText(row.value, 10, width);
            let baseline = y - 22;
            for (const line of lines) {
                this.paint(line, x, baseline, 10, "F1", INK);
                baseline -= 13;
            }
            y -= 12 + lines.length * 13 + 6;
        }
        return top - y;
    }

    private details() {
        const gap = 24;
        const width = (CONTENT_W - gap) / 2;
        const fulfillment = [{ label: labels.method, value: this.receipt.fulfillmentMethod }, ...this.receipt.fulfillmentRows];
        const payment = [
            { label: labels.paymentMethod, value: this.receipt.paymentMethod },
            { label: labels.paymentStatus, value: this.receipt.paymentStatus },
        ];
        const height = 16 + Math.max(this.stackHeight(fulfillment, width), this.stackHeight(payment, width));
        this.need(height + 12);
        this.y -= 8;
        this.rule(this.y);
        this.y -= 16;
        this.paint(labels.fulfillment, MARGIN_X, this.y, 9, "F2", INK);
        this.paint(labels.payment, MARGIN_X + width + gap, this.y, 9, "F2", INK);
        this.y -= 14;
        const used = Math.max(
            this.stack(fulfillment, MARGIN_X, width, this.y),
            this.stack(payment, MARGIN_X + width + gap, width, this.y),
        );
        this.y -= used;
    }

    private footer() {
        if (!this.receipt.disclaimer.trim()) return;
        const lines = wrapText(this.receipt.disclaimer, 8.5, CONTENT_W);
        const height = 16 + lines.length * 11;
        this.need(height);
        this.y -= 6;
        this.rule(this.y, HAIR, 0.5);
        this.y -= 14;
        for (const line of lines) {
            this.paint(line, MARGIN_X, this.y, 8.5, "F1", MUTED);
            this.y -= 11;
        }
    }
}

function encodePdf(pages: string[], logo: Logo | null) {
    const objects = new Map<number, Buffer>();
    const font = (name: string) => Buffer.from(`<< /Type /Font /Subtype /Type1 /BaseFont /${name} >>`);
    objects.set(4, font("Helvetica"));
    objects.set(5, font("Helvetica-Bold"));
    let next = 6;
    let imageId = 0;
    if (logo) {
        imageId = next;
        next += 1;
        const raw = deflateSync(logo.rgb);
        objects.set(imageId, Buffer.concat([
            Buffer.from(`<< /Type /XObject /Subtype /Image /Width ${logo.width} /Height ${logo.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode /Length ${raw.length} >> stream\n`),
            raw,
            Buffer.from("\nendstream"),
        ]));
    }
    const pageIds: number[] = [];
    for (const content of pages) {
        const contentId = next;
        next += 1;
        const pageId = next;
        next += 1;
        pageIds.push(pageId);
        const stream = Buffer.from(content);
        objects.set(contentId, Buffer.concat([
            Buffer.from(`<< /Length ${stream.length} >> stream\n`),
            stream,
            Buffer.from("\nendstream"),
        ]));
        const image = imageId ? ` /XObject << /Im1 ${imageId} 0 R >>` : "";
        objects.set(pageId, Buffer.from(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${n(PAGE_W)} ${n(PAGE_H)}] /Contents ${contentId} 0 R /Resources << /Font << /F1 4 0 R /F2 5 0 R >>${image} >> >>`));
    }
    objects.set(1, Buffer.from("<< /Type /Catalog /Pages 2 0 R >>"));
    objects.set(2, Buffer.from(`<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`));
    const max = Math.max(...objects.keys());
    const chunks: Buffer[] = [Buffer.from("%PDF-1.4\n")];
    const offsets = [0];
    for (let number = 1; number <= max; number += 1) {
        offsets[number] = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
        const body = objects.get(number) ?? Buffer.from("<< >>");
        chunks.push(Buffer.from(`${number} 0 obj\n`), body, Buffer.from("\nendobj\n"));
    }
    const xref = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    let trailer = `xref\n0 ${max + 1}\n0000000000 65535 f \n`;
    for (let number = 1; number <= max; number += 1) trailer += `${String(offsets[number]).padStart(10, "0")} 00000 n \n`;
    trailer += `trailer << /Size ${max + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
    chunks.push(Buffer.from(trailer));
    return Buffer.concat(chunks);
}

export function receiptPdf(receipt: ReceiptDocument) {
    return new Sheet(receipt, logoImage()).draw();
}
