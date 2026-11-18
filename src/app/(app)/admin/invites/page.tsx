import { redirect } from "next/navigation";
import InviteForm from "@/components/admin/InviteForm";
import OwnerInstallCard from "@/components/admin/OwnerInstallCard";
import { requireRole } from "@/lib/auth/session";
import { getLocale, messages } from "@/lib/i18n";
import { publicAppUrl } from "@/lib/public-url";

export default async function InvitesPage() {
    try {
        await requireRole(["ADMIN", "SECONDARY_ADMIN"]);
    } catch {
        redirect("/dashboard");
    }

    const locale = await getLocale();
    const copy = messages(locale);
    const appUrl = publicAppUrl();

    return (
        <main className="mx-auto w-full max-w-xl flex-1 px-4 py-8 sm:px-6">
            <h1 className="text-2xl font-semibold tracking-tight text-emerald-950 dark:text-emerald-50">{copy.inviteTitle}</h1>
            <p className="mt-2 text-sm leading-6 text-stone-600 dark:text-stone-300">{copy.inviteLead}</p>
            <InviteForm copy={copy} locale={locale} appUrl={appUrl} />
            <OwnerInstallCard url={appUrl} copy={copy} />
        </main>
    );
}
