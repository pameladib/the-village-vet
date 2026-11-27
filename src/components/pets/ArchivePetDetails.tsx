import type { Copy } from "@/lib/i18n";

function withName(text: string, name: string) {
    return text.replaceAll("{name}", name);
}

export default function ArchivePetDetails({ name, copy }: { name: string; copy: Copy }) {
    return (
        <div className="mt-2 space-y-3 text-sm text-stone-600 dark:text-stone-300">
            <p>{withName(copy.archivePetLead, name)}</p>
            <ul className="list-disc space-y-1 ps-5">
                <li>{withName(copy.archivePetActive, name)}</li>
                <li>{withName(copy.archivePetAppointments, name)}</li>
                <li>{withName(copy.archivePetRecords, name)}</li>
                <li>{withName(copy.archivePetLater, name)}</li>
            </ul>
            <p>{withName(copy.archivePetNote, name)}</p>
        </div>
    );
}
