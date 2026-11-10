import OpeningHours from "@/components/OpeningHours";
import { clinicMapEmbed, getClinicSettings, phoneHref, whatsappHref } from "@/lib/clinic/public";
import { getLocale, messages } from "@/lib/i18n";

export default async function FindUsPage() {
    const locale = await getLocale();
    const copy = messages(locale);
    const settings = await getClinicSettings();
    const address = settings?.address?.trim();
    const mapsUrl = settings?.mapsUrl?.trim();
    const phone = settings?.phone?.trim();
    const whatsapp = settings?.whatsapp?.trim();
    const email = settings?.email?.trim();
    const call = phone ? phoneHref(phone) : null;
    const chat = whatsapp ? whatsappHref(whatsapp) : null;
    const map = clinicMapEmbed(locale, mapsUrl, address);

    return (
        <main className="mx-auto grid w-full max-w-6xl items-start gap-12 px-5 py-16 lg:grid-cols-2 lg:items-center lg:gap-16 lg:py-24">
            <div>
                <h1 className="text-5xl text-emerald-950">{copy.visitHeading}</h1>

                {(address || mapsUrl) && (
                    <section className="mt-12">
                        <h2 className="text-lg text-emerald-950">{copy.addressHeading}</h2>
                        {address && <p className="mt-3 text-lg leading-8 text-stone-700">{address}</p>}
                        {mapsUrl && (
                            <a
                                href={mapsUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-5 inline-flex rounded-full bg-emerald-900 px-5 py-3 text-sm font-medium text-white hover:bg-emerald-950"
                            >
                                {copy.getDirections}
                            </a>
                        )}
                    </section>
                )}

                {(phone || whatsapp || email) && (
                    <section className="mt-12">
                        <h2 className="text-lg text-emerald-950">{copy.navContact}</h2>
                        <ul className="mt-4 space-y-5">
                            {phone && (
                                <li>
                                    <p className="text-sm text-stone-500">{copy.phone}</p>
                                    {call ? <a href={call} className="mt-1 inline-block text-lg text-emerald-950 hover:underline">{phone}</a> : <p className="mt-1 text-lg text-emerald-950">{phone}</p>}
                                </li>
                            )}
                            {whatsapp && (
                                <li>
                                    <p className="text-sm text-stone-500">{copy.whatsapp}</p>
                                    {chat ? <a href={chat} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-lg text-emerald-950 hover:underline">{whatsapp}</a> : <p className="mt-1 text-lg text-emerald-950">{whatsapp}</p>}
                                </li>
                            )}
                            {email && (
                                <li>
                                    <p className="text-sm text-stone-500">{copy.footerEmail}</p>
                                    <a href={`mailto:${email}`} className="mt-1 inline-block text-lg text-emerald-950 hover:underline">{email}</a>
                                </li>
                            )}
                        </ul>
                    </section>
                )}

                <section id="hours" className="mt-12 max-w-sm">
                    <h2 className="text-lg text-emerald-950">{copy.openingHours}</h2>
                    <div className="mt-4">
                        <OpeningHours copy={copy} />
                    </div>
                </section>
            </div>

            {map && (
                <div className="aspect-[4/3] w-full min-w-0 overflow-hidden rounded-2xl bg-stone-100">
                    <iframe
                        title={copy.mapTitle}
                        src={map}
                        className="h-full w-full border-0"
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                        allowFullScreen
                    />
                </div>
            )}
        </main>
    );
}
