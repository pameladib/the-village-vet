import { headers } from "next/headers";
import { redirect } from "next/navigation";
import OwnerDashboard from "@/components/dashboards/OwnerDashboard";
import StaffDashboard from "@/components/dashboards/StaffDashboard";
import { auth } from "@/lib/auth/auth";
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
    if (!session) redirect("/");

    const copy = messages(await getLocale());
    const role = session.user.role;

    if (role === "ADMIN" || role === "SECONDARY_ADMIN") {
        const { q = "" } = await searchParams;
        const data = await loadStaffDashboard(session.user.id, role, q);
        return <StaffDashboard copy={copy} {...data} />;
    }

    const data = await loadOwnerDashboard(session.user.id, session.user.name);
    return <OwnerDashboard copy={copy} {...data} />;
}
