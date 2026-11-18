import { redirect } from "next/navigation";
import StaffOrderForm from "@/components/shop/StaffOrderForm";
import { requireRole } from "@/lib/auth/session";
import { getLocale, messages } from "@/lib/i18n";
import { getPricing } from "@/lib/shop/pricing";

export default async function NewStaffOrderPage() {
    try {
        await requireRole(["ADMIN", "SECONDARY_ADMIN"]);
    } catch {
        redirect("/dashboard");
    }

    const [locale, pricing] = await Promise.all([getLocale(), getPricing()]);
    const copy = messages(locale);

    return (
        <main className="mx-auto w-full min-w-0 max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
            <h1 className="text-2xl font-semibold tracking-tight text-emerald-950 dark:text-emerald-50">{copy.shopNewOrder}</h1>
            <p className="mt-1 text-sm text-stone-600 dark:text-stone-300">{copy.shopNewOrderLead}</p>
            <StaffOrderForm copy={copy} locale={locale} currency={pricing.currency} />
        </main>
    );
}
