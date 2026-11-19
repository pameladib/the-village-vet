import { ChevronLeft } from "lucide-react";
import HistoryBack from "@/components/HistoryBack";
import ProfileForm from "@/components/auth/ProfileForm";
import { requireRole } from "@/lib/auth/session";
import { getLocale, messages } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function ProfilePage() {
    let session;
    try {
        session = await requireRole(["OWNER"]);
    } catch (error) {
        if (error instanceof Error && error.message === "User is not authenticated") redirect("/login?next=/profile");
        redirect("/dashboard");
    }

    const owner = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { name: true, phoneNumber: true, username: true },
    });
    if (!owner?.username) redirect("/dashboard");

    const locale = await getLocale();
    const copy = messages(locale);

    return (
        <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 py-8">
            <div className="rounded-2xl bg-emerald-50 p-4 dark:bg-stone-950">
                <section className="rounded-2xl border border-emerald-200 bg-white p-5 dark:border-emerald-900 dark:bg-stone-900">
                    <HistoryBack fallback="/dashboard" className="inline-flex cursor-pointer items-center gap-1 text-sm font-medium text-emerald-800 dark:text-emerald-200">
                        <ChevronLeft className="size-4 rtl:rotate-180" strokeWidth={1.5} />
                        {copy.bookBack}
                    </HistoryBack>
                    <h1 className="mt-4 text-2xl font-semibold text-emerald-950 dark:text-emerald-50">{copy.profile}</h1>
                    <p className="mt-1 text-sm text-emerald-800 dark:text-emerald-200">{copy.profileLead}</p>
                    <ProfileForm
                        copy={copy}
                        username={owner.username}
                        name={owner.name}
                        phoneNumber={owner.phoneNumber}
                    />
                </section>
            </div>
        </main>
    );
}
