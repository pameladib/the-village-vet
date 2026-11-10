import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/session";
import { documentRequestStatus } from "@/lib/auth/permissions";
import { DOCUMENT_TYPES, MEDICAL_DOCUMENTS_BUCKET, isSafeObjectKey } from "@/lib/storage/files";
import { createDownloadUrl } from "@/lib/storage/supabase";

function downloadName(title: string, key: string) {
    const extension = key.split(".").pop() ?? "pdf";
    const base = title.replaceAll(/[^A-Za-z0-9 ._-]+/g, "").trim().slice(0, 80);
    return `${base || "document"}.${extension}`;
}

export async function GET(_request: Request, context: { params: Promise<{ id: string; docId: string }> }) {
    const { id, docId } = await context.params;
    let session;
    try {
        session = await requireAuth();
    } catch {
        session = null;
    }

    const document = session
        ? await prisma.medicalDocument.findFirst({
            where: { id: docId, petId: id },
            include: { pet: { select: { ownerId: true } } },
        })
        : null;

    const status = documentRequestStatus({
        signedIn: Boolean(session),
        role: session?.user.role ?? "",
        userId: session?.user.id ?? "",
        document: document ? { ownerId: document.pet.ownerId } : null,
    });
    if (status !== 200 || !document) return new Response(status === 401 ? "Sign in required" : status === 404 ? "Not found" : "Not available", { status });
    if (!(document.contentType in DOCUMENT_TYPES) || !isSafeObjectKey(document.storedName) || !document.storedName.startsWith(`${id.toLowerCase()}/`)) {
        return new Response("Not available", { status: 415 });
    }

    try {
        const signedUrl = await createDownloadUrl(
            MEDICAL_DOCUMENTS_BUCKET,
            document.storedName,
            downloadName(document.title, document.storedName),
        );
        return new Response(null, {
            status: 302,
            headers: {
                Location: signedUrl,
                "Cache-Control": "private, no-store",
            },
        });
    } catch {
        return new Response("Not found", { status: 404 });
    }
}
