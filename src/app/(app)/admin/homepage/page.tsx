import { redirect } from "next/navigation";
import ClinicPhotosForm from "@/components/admin/ClinicPhotosForm";
import HomepageCopyForm from "@/components/admin/HomepageCopyForm";
import { requireRole } from "@/lib/auth/session";
import { getLocale, messages } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";

export default async function HomepageContentPage() {
    try {
        await requireRole(["ADMIN"]);
    } catch {
        redirect("/dashboard");
    }

    const [settings, photos, locale] = await Promise.all([
        prisma.clinicSetting.findUnique({ where: { id: "clinic" } }),
        prisma.clinicPhoto.findMany({ orderBy: [{ position: "asc" }, { createdAt: "asc" }] }),
        getLocale(),
    ]);
    const copy = messages(locale);
    const english = messages("en");
    const arabic = messages("ar");

    return (
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
            <h1 className="text-2xl font-semibold text-emerald-950 dark:text-emerald-50">{copy.homepageContent}</h1>
            <p className="mt-1 text-sm leading-6 text-stone-500">{copy.homepageContentLead}</p>
            <HomepageCopyForm
                copy={copy}
                values={{
                    heroTitleEn: settings?.heroTitleEn ?? english.heroTitle,
                    heroTitleAr: settings?.heroTitleAr ?? arabic.heroTitle,
                    heroBodyEn: settings?.heroBodyEn ?? english.heroBody,
                    heroBodyAr: settings?.heroBodyAr ?? arabic.heroBody,
                    aboutLeadEn: settings?.aboutLeadEn ?? english.aboutLead,
                    aboutLeadAr: settings?.aboutLeadAr ?? arabic.aboutLead,
                    aboutBodyEn: settings?.aboutBodyEn ?? english.aboutBodyLong,
                    aboutBodyAr: settings?.aboutBodyAr ?? arabic.aboutBodyLong,
                }}
            />
            <ClinicPhotosForm
                copy={copy}
                photos={photos.flatMap((photo) =>
                    photo.kind === "HERO" || photo.kind === "ABOUT" || photo.kind === "GALLERY"
                        ? [{ id: photo.id, kind: photo.kind, captionEn: photo.captionEn, captionAr: photo.captionAr, version: photo.storageKey.split("/").pop() ?? photo.id }]
                        : [],
                )}
            />
        </main>
    );
}
