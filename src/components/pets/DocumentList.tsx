"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, File, FileImage, FileText, X } from "lucide-react";
import { confirmMedicalDocument, prepareMedicalDocumentUpload } from "@/lib/actions/documents";
import type { Copy, Locale } from "@/lib/i18n";
import { intlLocale } from "@/lib/intl-locale";
import { uploadToSignedUrl } from "@/lib/storage/direct-upload";

export type PetDocument = {
    id: string;
    title: string;
    contentType: string;
    createdAt: string;
};

function fileKind(contentType: string) {
    if (contentType === "application/pdf") return { label: "PDF", kind: "pdf" as const };
    if (contentType === "image/jpeg") return { label: "JPG", kind: "image" as const };
    if (contentType === "image/png") return { label: "PNG", kind: "image" as const };
    if (contentType === "image/webp") return { label: "WEBP", kind: "image" as const };
    const label = contentType.split("/").pop()?.toUpperCase() || "FILE";
    return { label, kind: "other" as const };
}

function uploadMessage(message: string | undefined, copy: Copy) {
    if (!message) return copy.medDocsSaveFailed;
    if (message.startsWith("A document must be under")) return copy.medDocsTooBig;
    if (message.startsWith("A document must be")) return copy.medDocsType;
    if (message === "That file is not a valid document.") return copy.medDocsInvalid;
    if (message === "File storage is not set up yet.") return copy.medDocsNotReady;
    if (message === "You cannot add documents for this pet." || message === "That pet was not found.") return copy.medDocsDenied;
    if (message === "Could not store the file.") return copy.medDocsStoreFailed;
    if (message.includes("10 MB") || message.toLowerCase().includes("title")) return copy.medDocsNeedFile;
    return copy.medDocsSaveFailed;
}

export default function DocumentList({
    petId,
    canUpload,
    documents,
    copy,
    locale,
}: {
    petId: string;
    canUpload: boolean;
    documents: PetDocument[];
    copy: Copy;
    locale: Locale;
}) {
    const router = useRouter();
    const uploadDialog = useRef<HTMLDialogElement>(null);
    const viewerDialog = useRef<HTMLDialogElement>(null);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const [pending, setPending] = useState(false);
    const [open, setOpen] = useState<PetDocument | null>(null);
    const uploadedOn = new Intl.DateTimeFormat(intlLocale(locale), {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "Asia/Beirut",
    });

    function closeUpload() {
        if (pending) return;
        setError(null);
        uploadDialog.current?.close();
    }

    function view(document: PetDocument) {
        setOpen(document);
        const dialog = viewerDialog.current;
        if (dialog && !dialog.open) dialog.showModal();
    }

    const viewing = open ? fileKind(open.contentType) : null;

    return (
        <section className="mt-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-medium text-emerald-900 dark:text-emerald-200">{copy.medDocs}</h3>
                {canUpload && (
                    <button
                        type="button"
                        onClick={() => {
                            setError(null);
                            uploadDialog.current?.showModal();
                        }}
                        className="inline-flex items-center rounded-full border border-emerald-800 px-3 py-1.5 text-sm font-medium text-emerald-900 hover:bg-emerald-50 dark:border-emerald-300 dark:text-emerald-100 dark:hover:bg-emerald-950"
                    >
                        {copy.medDocsUpload}
                    </button>
                )}
            </div>
            {notice && <p className="mt-2 text-sm text-emerald-800 dark:text-emerald-200">{notice}</p>}
            {documents.length === 0 ? (
                <p className="mt-2 rounded-2xl border border-[#E5E7EB] bg-white px-3.5 py-3.5 text-sm text-stone-500 dark:border-stone-800 dark:bg-stone-900">{copy.medDocsEmpty}</p>
            ) : (
                <ul className="mt-2 flex flex-col gap-2">
                    {documents.map((document) => {
                        const kind = fileKind(document.contentType);
                        const Icon = kind.kind === "pdf" ? FileText : kind.kind === "image" ? FileImage : File;
                        return (
                            <li key={document.id} className="flex flex-col gap-3 rounded-2xl border border-[#E5E7EB] bg-white px-3 py-3 sm:flex-row sm:items-center dark:border-stone-800 dark:bg-stone-900">
                                <div className="flex min-w-0 flex-1 items-center gap-3">
                                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                                        <Icon className="size-4" strokeWidth={1.75} />
                                    </span>
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-medium text-stone-900 dark:text-stone-50">{document.title}</p>
                                        <p className="text-xs text-stone-500">
                                            {kind.label}
                                            <span className="px-1.5">·</span>
                                            {uploadedOn.format(new Date(document.createdAt))}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex shrink-0 gap-2">
                                    <button type="button" onClick={() => view(document)} className="rounded-full bg-emerald-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-950">
                                        {copy.medDocsView}
                                    </button>
                                    <a href={`/pets/${petId}/documents/${document.id}`} className="inline-flex items-center gap-1.5 rounded-full border border-[#E5E7EB] px-3 py-1.5 text-sm font-medium text-stone-700 hover:border-emerald-700 hover:text-emerald-900 dark:border-stone-700 dark:text-stone-200">
                                        <Download className="size-3.5" strokeWidth={1.75} />
                                        {copy.medDocsDownload}
                                    </a>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}

            <dialog
                ref={uploadDialog}
                className="m-auto max-h-[calc(100dvh-2rem)] w-[min(28rem,calc(100%-2rem))] overflow-y-auto rounded-2xl border border-[#E5E7EB] bg-white p-5 text-stone-900 shadow-lg backdrop:bg-stone-950/40 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-50"
                onCancel={(event) => {
                    if (pending) event.preventDefault();
                }}
                onClose={() => setError(null)}
            >
                <h3 className="text-base font-semibold text-emerald-950 dark:text-emerald-50">{copy.medDocsUpload}</h3>
                <form
                    className="mt-4 flex flex-col gap-3"
                    onSubmit={async (event) => {
                        event.preventDefault();
                        const form = event.currentTarget;
                        const fileInput = form.elements.namedItem("file");
                        const selected = fileInput instanceof HTMLInputElement ? fileInput.files?.[0] : undefined;
                        const title = new FormData(form).get("title");
                        if (!selected) {
                            setError(copy.medDocsNeedFile);
                            return;
                        }
                        setPending(true);
                        setError(null);
                        let timer: ReturnType<typeof setTimeout> | undefined;
                        const deadline = new Promise<never>((_, reject) => {
                            timer = setTimeout(() => reject(new Error("timeout")), 70_000);
                        });
                        try {
                            const prepared = await Promise.race([
                                prepareMedicalDocumentUpload(petId, {
                                    title: String(title ?? ""),
                                    contentType: selected.type,
                                    size: selected.size,
                                }),
                                deadline,
                            ]);
                            if (!prepared.success) {
                                setError(uploadMessage(prepared.formErrors[0], copy));
                                return;
                            }
                            await Promise.race([uploadToSignedUrl(prepared.signedUrl, selected), deadline]);
                            const confirmed = await Promise.race([
                                confirmMedicalDocument(petId, {
                                    title: String(title ?? ""),
                                    key: prepared.key,
                                    contentType: selected.type,
                                }),
                                deadline,
                            ]);
                            if (!confirmed.success) {
                                setError(uploadMessage(confirmed.formErrors[0], copy));
                                return;
                            }
                            form.reset();
                            uploadDialog.current?.close();
                            setNotice(copy.medDocsUploaded);
                            router.refresh();
                        } catch {
                            setError(copy.medDocsStoreFailed);
                        } finally {
                            clearTimeout(timer);
                            setPending(false);
                        }
                    }}
                >
                    <label className="flex flex-col gap-1 text-sm text-stone-700 dark:text-stone-200">
                        {copy.medDocsTitle}
                        <input name="title" required maxLength={120} className="rounded-xl border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-stone-900 outline-none focus:border-emerald-800 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-50" />
                    </label>
                    <label className="flex flex-col gap-1 text-sm text-stone-700 dark:text-stone-200">
                        {copy.medDocsFile}
                        <input name="file" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" className="text-sm" />
                    </label>
                    {error && <p className="text-sm text-red-700 dark:text-red-300">{error}</p>}
                    {pending && <p className="text-sm text-stone-500">{copy.medDocsSaving}</p>}
                    <div className="flex flex-wrap justify-end gap-2">
                        <button type="button" onClick={closeUpload} disabled={pending} className="rounded-full px-3 py-2 text-sm text-stone-600 hover:bg-stone-100 disabled:opacity-60 dark:text-stone-300 dark:hover:bg-stone-800">
                            {copy.medDocsCancel}
                        </button>
                        <button type="submit" disabled={pending} className="rounded-full bg-emerald-900 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-950 disabled:opacity-60">
                            {pending ? copy.medDocsSaving : copy.medDocsSave}
                        </button>
                    </div>
                </form>
            </dialog>

            <dialog
                ref={viewerDialog}
                className="m-0 h-dvh w-full max-h-none max-w-none rounded-none border-0 bg-white p-0 text-stone-900 shadow-lg backdrop:bg-stone-950/50 sm:m-auto sm:h-[min(90dvh,52rem)] sm:w-[min(64rem,calc(100%-2rem))] sm:rounded-2xl sm:border sm:border-[#E5E7EB] sm:dark:border-stone-700 dark:bg-stone-950 dark:text-stone-50"
                onClose={() => setOpen(null)}
            >
                {open && viewing && (
                    <div className="flex h-full flex-col">
                        <header className="flex items-center gap-2 border-b border-[#E5E7EB] px-4 py-3 dark:border-stone-800">
                            <h3 className="min-w-0 flex-1 truncate text-base font-semibold text-emerald-950 dark:text-emerald-50">{open.title}</h3>
                            <a href={`/pets/${petId}/documents/${open.id}`} className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-950">
                                <Download className="size-3.5" strokeWidth={1.75} />
                                {copy.medDocsDownload}
                            </a>
                            <button type="button" onClick={() => viewerDialog.current?.close()} aria-label={copy.medDocsClose} className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800">
                                <X className="size-4" strokeWidth={1.75} />
                            </button>
                        </header>
                        <div className="min-h-0 flex-1 bg-stone-100 dark:bg-stone-900">
                            {viewing.kind === "pdf" && (
                                <iframe title={open.title} src={`/pets/${petId}/documents/${open.id}?view=1`} className="size-full bg-white" />
                            )}
                            {viewing.kind === "image" && (
                                <div className="flex size-full items-center justify-center overflow-auto p-4">
                                    <img src={`/pets/${petId}/documents/${open.id}?view=1`} alt={open.title} className="max-h-full max-w-full object-contain" />
                                </div>
                            )}
                            {viewing.kind === "other" && (
                                <p className="px-6 py-8 text-sm leading-6 text-stone-600 dark:text-stone-300">{copy.medDocsPreviewNone}</p>
                            )}
                        </div>
                    </div>
                )}
            </dialog>
        </section>
    );
}
