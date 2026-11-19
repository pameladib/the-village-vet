import HistoryBack from "@/components/HistoryBack";
import { headers } from "next/headers";
import CheckoutForm from "@/components/shop/CheckoutForm";
import { auth } from "@/lib/auth/auth";
import { getLocale, messages } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { getDisplayCurrency } from "@/lib/shop/pricing";

export default async function CheckoutPage() {
    const [locale, currency] = await Promise.all([getLocale(), getDisplayCurrency()]);
    const copy = messages(locale);
    const session = await auth.api.getSession({ headers: await headers() });
    const owner = session?.user.role === "OWNER"
        ? await prisma.user.findUnique({ where: { id: session.user.id }, select: { phoneNumber: true } })
        : null;

    return (
        <main className="bg-[#f6f1e8]">
            <div className="mx-auto w-full max-w-2xl px-5 py-10">
                <HistoryBack fallback="/shop/cart" className="cursor-pointer text-sm font-medium text-emerald-800">{copy.shopCart}</HistoryBack>
                <h1 className="mt-3 text-4xl text-emerald-950">{copy.shopCheckout}</h1>
                <p className="mt-3 max-w-lg text-sm leading-6 text-stone-600">{copy.shopCheckoutLead}</p>
                <CheckoutForm copy={copy} locale={locale} phone={owner?.phoneNumber ?? ""} currency={currency} />
            </div>
        </main>
    );
}
