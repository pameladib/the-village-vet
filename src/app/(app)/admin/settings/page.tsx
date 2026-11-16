import Link from "next/link";
import { redirect } from "next/navigation";
import ClinicSettingsForm from "@/components/admin/ClinicSettingsForm";
import { requireRole } from "@/lib/auth/session";
import { getLocale, messages } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";

export default async function ClinicSettingsPage() {
    try {
        await requireRole(["ADMIN"]);
    } catch {
        redirect("/dashboard");
    }

    const settings = await prisma.clinicSetting.findUnique({ where: { id: "clinic" } });
    const copy = messages(await getLocale());

    return (
        <main className="mx-auto w-full max-w-lg flex-1 px-4 py-8">
            <Link href="/dashboard" className="text-sm font-medium text-emerald-800">{copy.bookBack}</Link>
            <h1 className="mt-3 text-2xl font-semibold text-emerald-950 dark:text-emerald-50">{copy.settings}</h1>
            <ClinicSettingsForm
                copy={copy}
                phone={settings?.phone ?? ""}
                whatsapp={settings?.whatsapp ?? ""}
                email={settings?.email ?? ""}
                address={settings?.address ?? ""}
                mapsUrl={settings?.mapsUrl ?? ""}
                about={settings?.about ?? ""}
            />
        </main>
    );
}
