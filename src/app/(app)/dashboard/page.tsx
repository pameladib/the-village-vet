import { headers } from "next/headers";
import { redirect } from "next/navigation";
import OwnerDashboard from "@/components/dashboards/OwnerDashboard";
import StaffDashboard from "@/components/dashboards/StaffDashboard";
import { auth } from "@/lib/auth/auth";
import { canManageScheduleBlocks } from "@/lib/auth/permissions";
import { getLocale, messages } from "@/lib/i18n";
import { loadOwnerDashboard } from "./load-owner";
import { loadStaffDashboard } from "./load-staff";

export default async function DashboardPage({
    searchParams,
}: {
    searchParams: Promise<{ q?: string }>;
}) {
    const session = await auth.api.getSession({
        headers: await headers(),
    });
    if (!session) redirect("/login");

    const locale = await getLocale();
    const copy = messages(locale);
    const role = session.user.role;

    if (role === "ADMIN" || role === "SECONDARY_ADMIN") {
        const { q = "" } = await searchParams;
        if (q.trim()) redirect(`/admin/patients?q=${encodeURIComponent(q.trim())}`);
        const data = await loadStaffDashboard(role);
        return <StaffDashboard copy={copy} locale={locale} manageClinic={canManageScheduleBlocks(role)} {...data} />;
    }

    const data = await loadOwnerDashboard(session.user.id, session.user.name);
    return <OwnerDashboard copy={copy} locale={locale} {...data} />;
}
