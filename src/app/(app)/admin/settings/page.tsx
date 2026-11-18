import { redirect } from "next/navigation";
import ClinicSettingsForm from "@/components/admin/ClinicSettingsForm";
import PricingForm from "@/components/admin/PricingForm";
import { requireRole } from "@/lib/auth/session";
import { getLocale, messages } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { getPricing } from "@/lib/shop/pricing";

export default async function ClinicSettingsPage() {
    try {
        await requireRole(["ADMIN"]);
    } catch {
        redirect("/dashboard");
    }

    const [settings, pricing] = await Promise.all([
        prisma.clinicSetting.findUnique({ where: { id: "clinic" } }),
        getPricing(),
    ]);
    const copy = messages(await getLocale());

    return (
        <main className="mx-auto w-full max-w-lg flex-1 px-4 py-8">
            <h1 className="text-2xl font-semibold text-emerald-950 dark:text-emerald-50">{copy.settings}</h1>
            <ClinicSettingsForm
                copy={copy}
                phone={settings?.phone ?? ""}
                whatsapp={settings?.whatsapp ?? ""}
                email={settings?.email ?? ""}
                address={settings?.address ?? ""}
                mapsUrl={settings?.mapsUrl ?? ""}
                about={settings?.about ?? ""}
            />
            <PricingForm copy={copy} currency={pricing.currency} rate={pricing.rate} />
        </main>
    );
}
