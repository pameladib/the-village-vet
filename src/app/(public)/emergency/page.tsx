import { getClinicSettings, phoneHref, whatsappHref } from "@/lib/clinic/public";
import { getLocale, messages } from "@/lib/i18n";

const primary = "inline-flex w-full items-center justify-center rounded-full bg-emerald-900 px-7 py-3.5 text-sm font-medium text-white hover:bg-emerald-950 sm:w-auto";
const secondary = "inline-flex w-full items-center justify-center rounded-full border border-emerald-900 px-7 py-3.5 text-sm font-medium text-emerald-900 hover:bg-emerald-50 sm:w-auto";

export default async function EmergencyPage() {
    const copy = messages(await getLocale());
    const settings = await getClinicSettings();
    const phone = settings?.phone?.trim() ?? "";
    const call = phone ? phoneHref(phone) : null;
    const chat = phone ? whatsappHref(phone) : null;

    return (
        <main className="mx-auto flex w-full max-w-3xl flex-col items-center px-5 py-10 text-center sm:py-14">
            <p className="text-sm font-semibold tracking-wide text-emerald-800">{copy.emergency}</p>
            <h1 className="mt-3 max-w-xl text-balance text-4xl leading-tight text-emerald-950 sm:max-w-2xl sm:text-5xl">{copy.emergencyTitle}</h1>
            <p className="mt-3 max-w-lg text-lg leading-7 text-stone-600">{copy.emergencyLead}</p>
            {call ? (
                <a href={call} className="mt-3 text-3xl text-emerald-950 sm:text-4xl">{phone}</a>
            ) : (
                <p className="mt-3 max-w-md text-base leading-7 text-stone-600">{copy.contactPending}</p>
            )}
            {call && (
                <div className="mt-5 flex w-full max-w-md flex-col items-stretch justify-center gap-3 sm:w-auto sm:flex-row sm:items-center">
                    <a href={call} className={primary}>{copy.emergencyCall}</a>
                    {chat && (
                        <a href={chat} target="_blank" rel="noopener noreferrer" className={secondary}>
                            {copy.emergencyWhatsapp}
                        </a>
                    )}
                </div>
            )}
            <p className="mt-5 max-w-2xl text-sm leading-5 text-stone-500">{copy.emergencyDisclaimer}</p>
        </main>
    );
}
