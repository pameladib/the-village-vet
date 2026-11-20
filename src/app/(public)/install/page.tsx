import AppQr from "@/components/public/AppQr";
import { getLocale, messages } from "@/lib/i18n";
import { clinicWebsite } from "@/lib/public-url";

export default async function InstallPage() {
    const locale = await getLocale();
    const copy = messages(locale);
    const steps = [copy.installStepSafari, copy.installStepShare, copy.installStepAdd, copy.installStepConfirm];

    return (
        <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 py-8">
            <h1 className="text-2xl font-semibold text-emerald-950">{copy.installLink}</h1>
            <p className="mt-2 text-sm leading-6 text-stone-700">{copy.installLead}</p>
            <ol className="mt-4 list-decimal space-y-2 ps-5 text-sm text-stone-800">
                {steps.map((step) => <li key={step}>{step}</li>)}
            </ol>
            <div className="mt-6">
                <AppQr url={`${clinicWebsite}/q`} size={240} label={copy.installQr} />
            </div>
            <p className="mt-3 text-sm" dir="ltr">{clinicWebsite}</p>
            <p className="mt-4 text-sm text-stone-500">{copy.installQr}</p>
        </main>
    );
}
