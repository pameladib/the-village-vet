import Link from "next/link";
import { headers } from "next/headers";
import ClinicGallery from "@/components/public/ClinicGallery";
import ClinicPicture from "@/components/public/ClinicPicture";
import SmoothSectionLink from "@/components/public/SmoothSectionLink";
import { ServiceGrid } from "@/components/public/services";
import { auth } from "@/lib/auth/auth";
import { getClinicSettings, getPublicPhotos } from "@/lib/clinic/public";
import { getLocale, messages } from "@/lib/i18n";

const clinicMapsUrl = "https://maps.app.goo.gl/VgbXYipPXhcg4y8i8";

export default async function HomePage() {
    const headerList = await headers();
    const [locale, session] = await Promise.all([
        getLocale(),
        auth.api.getSession({ headers: headerList }),
    ]);
    const copy = messages(locale); // get the corresponding copy for the locale based on the locale we got from the cookie
    const bookHref = session ? "/appointments/new" : "/sign-up";
    const settings = await getClinicSettings();
    const photos = await getPublicPhotos(locale, copy);
    const mapsUrl = settings?.mapsUrl?.trim() || clinicMapsUrl;

    return (
        <main>
            <section className="mx-auto w-full max-w-6xl px-5 pt-12 pb-14 sm:pt-16 sm:pb-16">
                <div className="mx-auto max-w-4xl text-center">
                    <p className="text-xs font-semibold tracking-[0.18em] text-emerald-800 uppercase">{copy.clinicName}</p>
                    <h1 className="mt-4 text-5xl leading-[1.05] text-emerald-950 sm:text-6xl">{copy.heroTitle}</h1>
                </div>
                <figure className="mt-8 sm:mt-10">
                    <div className="relative aspect-[8/5] w-full overflow-hidden rounded-2xl bg-stone-100">
                        <ClinicPicture src={photos.hero.src} alt={photos.hero.alt} priority sizes="(min-width: 1152px) 69rem, 100vw" />
                    </div>
                    <figcaption className="mt-4 text-center text-base leading-7 text-stone-600 sm:mt-5">
                        {copy.heroBody}
                    </figcaption>
                </figure>
            </section>

            <section className="bg-stone-50">
                <div className="mx-auto grid w-full max-w-6xl items-center gap-10 px-5 py-14 lg:grid-cols-2 lg:gap-16 lg:py-16">
                    <div className="max-w-xl">
                        <h2 className="text-4xl text-emerald-950">{copy.aboutHeading}</h2>
                        <p className="mt-5 text-lg leading-8 text-stone-700">{copy.aboutLead}</p>
                        <p className="mt-4 text-base leading-7 text-stone-600">{copy.aboutBodyLong}</p>
                        <p className="mt-6 text-sm font-medium text-stone-500">{copy.addressHeading}</p>
                        <p className="mt-1 text-xl text-emerald-950">{copy.aboutLocality}</p>
                        <p className="text-base text-stone-600">{copy.aboutArea}</p>
                        <div className="mt-6 flex flex-wrap items-center gap-4">
                            <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center rounded-full bg-emerald-900 px-5 py-3 text-sm font-medium text-white transition duration-200 hover:bg-emerald-950">
                                {copy.getDirections}
                            </a>
                            <Link href="/about" className="text-sm font-semibold text-emerald-900 underline decoration-emerald-800/40 underline-offset-4 hover:decoration-emerald-800">
                                {copy.learnMore}
                            </Link>
                        </div>
                    </div>
                    <div className="flex w-fit flex-col items-start gap-3 lg:mx-auto">
                        <Link href={bookHref} className="inline-flex items-center justify-center rounded-full bg-emerald-900 px-5 py-3 text-sm font-medium text-white hover:bg-emerald-950">
                            {copy.bookAppointment}
                        </Link>
                        <SmoothSectionLink href="#services" className="inline-flex items-center justify-center rounded-full border border-stone-300 px-5 py-3 text-sm font-medium text-emerald-950 hover:border-emerald-800">
                            {copy.exploreServices}
                        </SmoothSectionLink>
                    </div>
                </div>
            </section>

            <ClinicGallery copy={copy} locale={locale} photos={photos.gallery} />

            <section id="services" className="scroll-mt-24 bg-stone-50">
                <div className="mx-auto w-full max-w-6xl px-5 py-20">
                    <div className="max-w-2xl">
                        <h2 className="text-4xl text-emerald-950">{copy.servicesHeading}</h2>
                        <p className="mt-4 text-base leading-7 text-stone-600">{copy.servicesLead}</p>
                    </div>
                    <div className="mt-10">
                        <ServiceGrid copy={copy} />
                    </div>
                </div>
            </section>

            <section className="bg-white">
                <div className="mx-auto flex w-full max-w-6xl flex-col items-center px-5 py-24 text-center sm:py-28">
                    <h2 className="max-w-3xl text-5xl text-emerald-950 sm:text-6xl">{copy.bookHeading}</h2>
                    <p className="mt-5 max-w-xl text-lg leading-8 text-stone-600">{copy.bookBody}</p>
                    <Link href={bookHref} className="mt-8 inline-flex items-center justify-center rounded-full bg-emerald-900 px-5 py-3 text-sm font-medium text-white hover:bg-emerald-950">
                        {copy.bookAppointment}
                    </Link>
                </div>
            </section>
        </main>
    );
}
