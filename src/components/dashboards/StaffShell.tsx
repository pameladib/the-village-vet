import StaffNav from "@/components/dashboards/StaffNav";
import type { Copy } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { followUpDueThrough } from "@/lib/visits/follow-up";

export default async function StaffShell({
    copy,
    clinical,
    manageClinic,
    children,
}: {
    copy: Copy;
    clinical: boolean;
    manageClinic: boolean;
    children: React.ReactNode;
}) {
    const dueThrough = followUpDueThrough();
    const followUpCount = clinical && dueThrough
        ? await prisma.visitFollowUp.count({ where: { status: "PENDING", dueOn: { lte: dueThrough } } })
        : 0;
    return (
        <div className="flex w-full flex-1 flex-col bg-[#F8FAF9] md:flex-row dark:bg-stone-950">
            <StaffNav copy={copy} clinical={clinical} manageClinic={manageClinic} followUpCount={followUpCount} />
            <div className="min-w-0 flex-1">{children}</div>
        </div>
    );
}
