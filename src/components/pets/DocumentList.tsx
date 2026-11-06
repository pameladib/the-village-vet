"use client";

import { useState } from "react";
import { confirmMedicalDocument, prepareMedicalDocumentUpload } from "@/lib/actions/documents";
import { uploadToSignedUrl } from "@/lib/storage/direct-upload";

export default function DocumentList({
    petId,
    canUpload,
    documents,
}: {
    petId: string;
    canUpload: boolean;
    documents: { id: string; title: string }[];
}) {
    const [error, setError] = useState<string | null>(null);
    const [pending, setPending] = useState(false);

    return (
        <section className="mt-6">
            <h3 className="text-sm font-medium text-emerald-900 dark:text-emerald-200">Documents</h3>
            <ul className="mt-2 flex flex-col gap-2">
                {documents.map((document) => (
                    <li key={document.id}>
                        <a className="text-sm font-medium text-emerald-800 underline dark:text-emerald-200" href={`/pets/${petId}/documents/${document.id}`}>
                            {document.title}
                        </a>
                    </li>
                ))}
                {documents.length === 0 && <li className="text-sm text-stone-500">No documents yet.</li>}
            </ul>
            {canUpload && (
                <form
                    className="mt-3 flex flex-col gap-2"
                    onSubmit={async (event) => {
                        event.preventDefault();
                        const form = event.currentTarget;
                        const fileInput = form.elements.namedItem("file");
                        const selected = fileInput instanceof HTMLInputElement ? fileInput.files?.[0] : undefined;
                        const title = new FormData(form).get("title");
                        if (!selected) {
                            setError("Add a title and a PDF or image under 10 MB.");
                            return;
                        }
                        setPending(true);
                        setError(null);
                        // The file goes to Supabase. The server only checks the session and signs the URL.
                        const prepared = await prepareMedicalDocumentUpload(petId, {
                            title: String(title ?? ""),
                            contentType: selected.type,
                            size: selected.size,
                        });
                        if (!prepared.success) {
                            setPending(false);
                            setError(prepared.formErrors[0] ?? "Could not save the document.");
                            return;
                        }
                        try {
                            await uploadToSignedUrl(prepared.signedUrl, selected);
                        } catch {
                            setPending(false);
                            setError("Could not store the file.");
                            return;
                        }
                        const confirmed = await confirmMedicalDocument(petId, {
                            title: String(title ?? ""),
                            key: prepared.key,
                            contentType: selected.type,
                        });
                        setPending(false);
                        if (!confirmed.success) {
                            setError(confirmed.formErrors[0] ?? "Could not save the document.");
                            return;
                        }
                        form.reset();
                        window.location.reload();
                    }}
                >
                    <input name="title" placeholder="Title" className="rounded-lg border border-stone-300 px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-950" />
                    <input name="file" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" className="text-sm" />
                    {error && <p className="text-sm text-red-700">{error}</p>}
                    <button type="submit" disabled={pending} className="w-fit rounded-lg bg-emerald-800 px-3 py-2 text-sm font-medium text-white disabled:opacity-60">
                        {pending ? "Saving…" : "Add document"}
                    </button>
                </form>
            )}
            <p className="mt-2 text-xs text-stone-500">
                Documents are private. Only the veterinarian and this pet&apos;s owner can open them.
            </p>
        </section>
    );
}
