import Image from "next/image";
import Link from "next/link";
import ClinicGallery from "@/components/public/ClinicGallery";
import { clinicHomePhoto, clinicVisitPhoto } from "@/components/public/photos";
import { ServiceGrid } from "@/components/public/services";
import { getLocale, messages } from "@/lib/i18n";

const bookHref = "/appointments/new";

export default async function HomePage() {
    const locale = await getLocale(); // get the locale from the cookie
    const copy = messages(locale); // get the corresponding copy for the locale based on the locale we got from the cookie

    return (
        <main>
            <section className="mx-auto grid w-full max-w-6xl items-center gap-12 px-5 py-16 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:py-24">
                <div className="contents lg:block">
                    <div className="order-1">
                        <p className="text-xs font-semibold tracking-[0.18em] text-emerald-800 uppercase">{copy.clinicName}</p>
                        <h1 className="mt-4 max-w-xl text-5xl leading-[1.05] text-emerald-950 sm:text-6xl">{copy.heroTitle}</h1>
                        <p className="mt-6 max-w-md text-lg leading-8 text-stone-600">{copy.heroBody}</p>
                    </div>
                    <div className="order-3 flex flex-col gap-3 sm:flex-row lg:mt-8">
                        <Link href={bookHref} className="inline-flex items-center justify-center rounded-full bg-emerald-900 px-5 py-3 text-sm font-medium text-white hover:bg-emerald-950">
                            {copy.bookAppointment}
                        </Link>
                        <Link href="#services" className="inline-flex items-center justify-center rounded-full border border-stone-300 px-5 py-3 text-sm font-medium text-emerald-950 hover:border-emerald-800">
                            {copy.exploreServices} 
                        </Link>
                    </div>
                </div>
                <div className="relative order-2 min-h-[28rem] overflow-hidden rounded-2xl bg-stone-100 sm:min-h-[34rem] lg:order-none">
                    <Image
                        src={clinicVisitPhoto}
                        alt="A veterinarian in a white coat holding a cat in a bright room."
                        fill
                        priority
                        sizes="(min-width: 1024px) 50vw, 100vw"
                        className="object-cover"
                    />
                </div>
            </section>

            <section className="bg-stone-50">
                <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-5 py-20 lg:grid-cols-2">
                    <div className="relative min-h-[22rem] overflow-hidden rounded-2xl bg-stone-200 lg:min-h-[28rem]">
                        <Image
                            src={clinicHomePhoto}
                            alt="A golden puppy running across a lawn."
                            fill
                            sizes="(min-width: 1024px) 40vw, 100vw"
                            className="object-cover"
                        />
                    </div>
                    <div className="max-w-lg">
                        <h2 className="text-4xl text-emerald-950">{copy.aboutHeading}</h2>
                        <p className="mt-5 text-lg leading-8 text-stone-700">{copy.aboutLead}</p>
                        <p className="mt-4 text-base leading-7 text-stone-600">{copy.aboutBodyLong}</p>
                        <Link href="/about" className="mt-6 inline-block text-sm font-semibold text-emerald-900 underline decoration-emerald-800/40 underline-offset-4 hover:decoration-emerald-800">
                            {copy.learnMore}
                        </Link>
                    </div>
                </div>
            </section>

            <section id="services" className="mx-auto w-full max-w-6xl scroll-mt-24 px-5 py-20">
                <div className="max-w-2xl">
                    <h2 className="text-4xl text-emerald-950">{copy.servicesHeading}</h2>
                    <p className="mt-4 text-base leading-7 text-stone-600">{copy.servicesLead}</p>
                </div>
                <div className="mt-10">
                    <ServiceGrid copy={copy} />
                </div>
            </section>

            <ClinicGallery copy={copy} locale={locale} />

            <section className="bg-emerald-900 text-white">
                <div className="mx-auto flex min-h-[32rem] w-full max-w-6xl flex-col items-start justify-center gap-8 px-5 py-24">
                    <div className="max-w-xl">
                        <h2 className="text-4xl text-white sm:text-5xl">{copy.bookHeading}</h2>
                        <p className="mt-5 text-lg leading-8 text-emerald-50">{copy.bookBody}</p>
                    </div>
                    <Link href={bookHref} className="inline-flex shrink-0 items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-emerald-950 hover:bg-emerald-50">
                        {copy.bookAppointment}
                    </Link>
                </div>
            </section>
        </main>
    );
}
