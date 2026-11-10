import Link from "next/link";
import { redirect } from "next/navigation";
import ClinicSettingsForm from "@/components/admin/ClinicSettingsForm";
import { requireRole } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export default async function ClinicSettingsPage() {
    try {
        await requireRole(["ADMIN"]);
    } catch {
        redirect("/dashboard");
    }

    const settings = await prisma.clinicSetting.findUnique({ where: { id: "clinic" } });

    return (
        <main className="mx-auto w-full max-w-lg flex-1 px-4 py-8">
            <Link href="/dashboard" className="text-sm text-emerald-800">Back</Link>
            <h1 className="mt-3 text-2xl font-semibold">Clinic details</h1>
            <ClinicSettingsForm
                phone={settings?.phone ?? ""}
                whatsapp={settings?.whatsapp ?? ""}
                email={settings?.email ?? ""}
                address={settings?.address ?? ""}
                mapsUrl={settings?.mapsUrl ?? ""}
                emergencyPhone={settings?.emergencyPhone ?? ""}
                about={settings?.about ?? ""}
            />
        </main>
    );
}
