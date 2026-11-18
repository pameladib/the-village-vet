import { getLocale, messages } from "@/lib/i18n";
import CartView from "@/components/shop/CartView";
import { getDisplayCurrency } from "@/lib/shop/pricing";

export default async function CartPage() {
    const [locale, currency] = await Promise.all([getLocale(), getDisplayCurrency()]);
    const copy = messages(locale);

    return (
        <main className="bg-[#f6f1e8]">
            <div className="mx-auto w-full max-w-2xl px-5 py-10">
                <h1 className="text-4xl text-emerald-950">{copy.shopCart}</h1>
                <CartView copy={copy} locale={locale} currency={currency} />
            </div>
        </main>
    );
}
