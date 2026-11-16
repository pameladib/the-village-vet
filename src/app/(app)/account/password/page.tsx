import { redirect } from "next/navigation";
import PasswordChangeForm from "@/components/auth/PasswordChangeForm";
import { ownerMustChangePassword } from "@/lib/auth/password-change";
import { requireAuth } from "@/lib/auth/session";
import { getLocale, messages } from "@/lib/i18n";

export default async function PasswordChangePage() {
    let session;
    try {
        session = await requireAuth();
    } catch {
        redirect("/login");
    }
    if (session.user.role !== "OWNER") redirect("/dashboard");
    if (!(await ownerMustChangePassword(session.user.id))) redirect("/dashboard");

    const locale = await getLocale();
    const copy = messages(locale);

    return (
        <main className="mx-auto w-full max-w-md px-4 py-8">
            <h1 className="text-2xl font-semibold tracking-tight text-emerald-950 dark:text-emerald-50">{copy.mustChangePassword}</h1>
            <p className="mt-2 text-sm leading-6 text-stone-600 dark:text-stone-300">{copy.mustChangeLead}</p>
            <PasswordChangeForm copy={copy} />
        </main>
    );
}
