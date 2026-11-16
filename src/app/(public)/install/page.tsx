import QRCode from "qrcode";
import { getLocale, messages } from "@/lib/i18n";

const installUrl = "https://the-village-vet.vercel.app";

export default async function InstallPage() {
    const locale = await getLocale();
    const copy = messages(locale);
    const svg = await QRCode.toString(installUrl, { type: "svg", margin: 1, width: 240 });
    const steps = [copy.installStepSafari, copy.installStepShare, copy.installStepAdd, copy.installStepConfirm];

    return (
        <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 py-8">
            <h1 className="text-2xl font-semibold text-emerald-950">{copy.installLink}</h1>
            <p className="mt-2 text-sm leading-6 text-stone-700">{copy.installLead}</p>
            <ol className="mt-4 list-decimal space-y-2 ps-5 text-sm text-stone-800">
                {steps.map((step) => <li key={step}>{step}</li>)}
            </ol>
            <div className="mt-6 w-fit rounded-2xl bg-white p-3" dangerouslySetInnerHTML={{ __html: svg }} />
            <p className="mt-3 text-sm" dir="ltr">{installUrl}</p>
            <p className="mt-4 text-sm text-stone-500">{copy.installQr}</p>
        </main>
    );
}
