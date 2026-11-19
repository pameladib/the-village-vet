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
        <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center px-5 py-16 text-center sm:py-20">
            <h1 className="max-w-full text-4xl leading-tight text-emerald-950 sm:text-5xl">{copy.emergencyTitle}</h1>
            <p className="mt-8 max-w-lg text-lg leading-7 text-stone-600 sm:mt-10">{copy.emergencyLead}</p>
            {call ? (
                <a href={call} className="mt-8 text-3xl text-emerald-950 sm:mt-10 sm:text-4xl">{phone}</a>
            ) : (
                <p className="mt-8 max-w-md text-base leading-7 text-stone-600 sm:mt-10">{copy.contactPending}</p>
            )}
            {call && (
                <div className="mt-8 flex w-full max-w-md flex-col items-stretch justify-center gap-3 sm:mt-10 sm:w-auto sm:flex-row sm:items-center">
                    <a href={call} className={primary}>{copy.emergencyCall}</a>
                    {chat && (
                        <a href={chat} target="_blank" rel="noopener noreferrer" className={secondary}>
                            {copy.emergencyWhatsapp}
                        </a>
                    )}
                </div>
            )}
            <p className="mt-8 max-w-2xl text-sm leading-5 text-stone-500 sm:mt-10">{copy.emergencyDisclaimer}</p>
        </main>
    );
}
