import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { DEFAULT_USD_RATE, isCurrency, validRate, type Currency } from "@/lib/shop/money";

export function pricingFrom(row: { priceCurrency: string; usdRate: number } | null): { currency: Currency; rate: number } {
    return {
        currency: isCurrency(row?.priceCurrency) ? row.priceCurrency : "USD",
        rate: row && validRate(row.usdRate) ? row.usdRate : DEFAULT_USD_RATE,
    };
}

export async function getPricing() {
    const row = await prisma.clinicSetting.findUnique({
        where: { id: "clinic" },
        select: { priceCurrency: true, usdRate: true },
    });
    return pricingFrom(row);
}

export async function getDisplayCurrency() {
    const saved = (await cookies()).get("currency")?.value;
    if (isCurrency(saved)) return saved;
    const pricing = await getPricing();
    return pricing.currency;
}
