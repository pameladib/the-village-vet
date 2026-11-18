import ClinicPicture from "@/components/public/ClinicPicture";
import { getClinicSettings, getPublicPhotos, homepageCopy } from "@/lib/clinic/public";
import { getLocale, messages } from "@/lib/i18n";

export default async function AboutPage() {
    const locale = await getLocale();
    const copy = messages(locale);
    const settings = await getClinicSettings();
    const photos = await getPublicPhotos(locale, copy);
    const home = homepageCopy(settings, locale, copy);
    const about = settings?.about?.trim();

    return (
        <main className="mx-auto grid w-full max-w-6xl items-center gap-12 px-5 py-16 lg:grid-cols-2 lg:py-24">
            <div className="max-w-xl">
                <h1 className="text-5xl text-emerald-950">{copy.aboutHeading}</h1>
                <p className="mt-6 text-lg leading-8 text-stone-700">{about || home.aboutLead}</p>
                {!about && <p className="mt-4 text-base leading-7 text-stone-600">{home.aboutBody}</p>}
            </div>
            <div className="relative min-h-[24rem] overflow-hidden rounded-2xl bg-stone-100">
                <ClinicPicture src={photos.about.src} alt={photos.about.alt} sizes="(min-width: 1024px) 40vw, 100vw" />
            </div>
        </main>
    );
}
