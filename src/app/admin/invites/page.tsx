import Link from "next/link";
import { redirect } from "next/navigation";
import InviteForm from "@/components/admin/InviteForm";
import { requireRole } from "@/lib/auth/session";

export default async function InvitesPage() {
    try {
        await requireRole(["ADMIN", "SECONDARY_ADMIN"]);
    } catch {
        redirect("/dashboard");
    }

    return (
        <main className="mx-auto w-full max-w-lg flex-1 px-4 py-8">
            <Link href="/dashboard" className="text-sm text-emerald-800">Back</Link>
            <h1 className="mt-3 text-2xl font-semibold">Owner setup link</h1>
            <p className="mt-1 text-sm text-stone-600">The owner chooses their own password on the link. Do not share one clinic password.</p>
            <InviteForm />
        </main>
    );
}
