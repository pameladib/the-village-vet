import { redirect } from "next/navigation";
import AddFollowUp from "@/components/admin/AddFollowUp";
import { todayInBeirut } from "@/lib/appointments/availability";
import { requireRole } from "@/lib/auth/session";
import { getLocale, messages } from "@/lib/i18n";

export default async function NewFollowUpPage() {
    try {
        await requireRole(["ADMIN"]);
    } catch {
        redirect("/dashboard");
    }

    const locale = await getLocale();
    const copy = messages(locale);

    return (
        <main className="mx-auto w-full min-w-0 max-w-md px-4 py-6 sm:px-6">
            <h1 className="text-2xl font-semibold tracking-tight text-emerald-950 dark:text-emerald-50">{copy.followUpAdd}</h1>
            <p className="mt-1 text-sm text-stone-500">{copy.followUpAddLead}</p>
            <AddFollowUp copy={copy} today={todayInBeirut()} />
        </main>
    );
}
