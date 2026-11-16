import { headers } from "next/headers";
import { redirect } from "next/navigation";
import StaffShell from "@/components/dashboards/StaffShell";
import { auth } from "@/lib/auth/auth";
import { canManageScheduleBlocks, canSeeClinicalRecords } from "@/lib/auth/permissions";
import { getLocale, messages } from "@/lib/i18n";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "SECONDARY_ADMIN")) {
        redirect("/dashboard");
    }

    const locale = await getLocale();
    return (
        <StaffShell
            copy={messages(locale)}
            clinical={canSeeClinicalRecords(session.user.role)}
            manageClinic={canManageScheduleBlocks(session.user.role)}
        >
            {children}
        </StaffShell>
    );
}
