import { redirect } from "next/navigation";
import ClinicPhotosForm from "@/components/admin/ClinicPhotosForm";
import { requireRole } from "@/lib/auth/session";
import { getLocale, messages } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";

export default async function HomepageContentPage() {
    try {
        await requireRole(["ADMIN"]);
    } catch {
        redirect("/dashboard");
    }

    const [photos, locale] = await Promise.all([
        prisma.clinicPhoto.findMany({ orderBy: [{ position: "asc" }, { createdAt: "asc" }] }),
        getLocale(),
    ]);
    const copy = messages(locale);

    return (
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
            <h1 className="text-2xl font-semibold text-emerald-950 dark:text-emerald-50">{copy.homepageContent}</h1>
            <p className="mt-1 text-sm leading-6 text-stone-500">{copy.homepageContentLead}</p>
            <ClinicPhotosForm
                copy={copy}
                photos={photos.flatMap((photo) =>
                    photo.kind === "HERO" || photo.kind === "GALLERY"
                        ? [{
                            id: photo.id,
                            kind: photo.kind,
                            captionEn: photo.captionEn,
                            captionAr: photo.captionAr,
                            version: photo.storageKey.split("/").pop() ?? photo.id,
                        }]
                        : [],
                )}
            />
        </main>
    );
}
