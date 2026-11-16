import StaffNav from "@/components/dashboards/StaffNav";
import type { Copy } from "@/lib/i18n";

export default function StaffShell({
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
    return (
        <div className="flex w-full flex-1 flex-col bg-[#F8FAF9] md:flex-row dark:bg-stone-950">
            <StaffNav copy={copy} clinical={clinical} manageClinic={manageClinic} />
            <div className="min-w-0 flex-1">{children}</div>
        </div>
    );
}
