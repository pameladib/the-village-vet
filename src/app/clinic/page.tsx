import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function ClinicPage() {
    const settings = await prisma.clinicSetting.findUnique({ where: { id: "clinic" } });
    const emergency = settings?.emergencyPhone?.trim();

    return (
        <main className="mx-auto w-full max-w-lg flex-1 px-4 py-8">
            <h1 className="text-2xl font-semibold text-emerald-950 dark:text-emerald-50">The Village Vet</h1>
            {settings?.about && <p className="mt-3 text-sm leading-6 text-stone-700 dark:text-stone-200">{settings.about}</p>}
            <dl className="mt-6 flex flex-col gap-3 text-sm">
                <div>
                    <dt className="font-medium">Phone</dt>
                    <dd>{settings?.phone ? <a className="text-emerald-800 underline" href={`tel:${settings.phone}`}>{settings.phone}</a> : "Not added yet."}</dd>
                </div>
                <div>
                    <dt className="font-medium">WhatsApp</dt>
                    <dd>{settings?.whatsapp ?? "Not added yet."}</dd>
                </div>
                <div>
                    <dt className="font-medium">Address</dt>
                    <dd>{settings?.address ?? "Not added yet."}</dd>
                </div>
            </dl>
            {settings?.mapsUrl && (
                <a className="mt-4 inline-block text-sm font-medium text-emerald-800 underline" href={settings.mapsUrl}>Open the map</a>
            )}
            <section className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/40">
                <h2 className="text-sm font-medium text-red-900 dark:text-red-100">Emergency</h2>
                {emergency ? (
                    <a className="mt-2 inline-block text-lg font-semibold text-red-800 underline" href={`tel:${emergency}`}>{emergency}</a>
                ) : (
                    <p className="mt-2 text-sm text-red-900 dark:text-red-100">An after-hours emergency number has not been configured.</p>
                )}
                <p className="mt-2 text-xs text-red-800 dark:text-red-200">Calling this number does not book an appointment.</p>
            </section>
            <Link href="/" className="mt-6 inline-block text-sm text-emerald-800">Back</Link>
        </main>
    );
}
