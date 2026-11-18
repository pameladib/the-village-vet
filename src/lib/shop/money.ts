type Language = "en" | "ar";

function numberLocale(locale: Language) {
    return locale === "ar" ? "ar-u-nu-arab" : "en-GB";
}

export const currencies = ["USD", "LBP"] as const;
export type Currency = (typeof currencies)[number];

// Lebanese pounds for one US dollar. The clinic edits this. It is not fetched from a rate service.
export const DEFAULT_USD_RATE = 89_500;

export function isCurrency(value: string | null | undefined): value is Currency {
    return value === "USD" || value === "LBP";
}

export function validRate(value: number) {
    return Number.isInteger(value) && value >= 1 && value <= 10_000_000;
}

// USD amounts are cents. LBP amounts are whole pounds. The unit price is converted, then multiplied by quantity.
export function convertMinor(amount: number, from: Currency, to: Currency, rate: number) {
    if (!validRate(rate) || !Number.isInteger(amount)) return null;
    if (from === to) return amount;
    if (from === "USD") return Math.round((amount * rate) / 100);
    return Math.round((amount * 100) / rate);
}

export function presentPrice(amount: number, from: Currency, to: Currency, rate: number, locale: Language) {
    const shown = convertMinor(amount, from, to, rate);
    return formatMoney(shown ?? amount, shown == null ? from : to, locale);
}

export function formatStored(amount: number, currency: string, locale: Language) {
    return formatMoney(amount, isCurrency(currency) ? currency : "LBP", locale);
}

export function formatMoney(amount: number, currency: Currency, locale: Language) {
    if (currency === "USD") {
        const dollars = new Intl.NumberFormat(numberLocale(locale), {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(amount / 100);
        return `$${dollars}`;
    }
    const pounds = new Intl.NumberFormat(numberLocale(locale), { maximumFractionDigits: 0 }).format(Math.round(amount));
    return `${pounds} LBP`;
}

export function minorFromInput(raw: string, currency: Currency) {
    const value = raw.trim();
    if (currency === "LBP") {
        if (!/^\d+$/.test(value)) return null;
        const pounds = Number(value);
        return pounds <= 1_000_000_000 ? pounds : null;
    }
    if (!/^\d+(\.\d{1,2})?$/.test(value)) return null;
    const [whole, fraction = ""] = value.split(".");
    const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
    return cents <= 1_000_000_000 ? cents : null;
}

export function inputFromMinor(amount: number, currency: Currency) {
    if (currency === "LBP") return String(amount);
    return (amount / 100).toFixed(2);
}
