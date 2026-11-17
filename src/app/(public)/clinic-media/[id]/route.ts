import { prisma } from "@/lib/prisma";
import { CLINIC_PHOTOS_BUCKET, isSafeObjectKey } from "@/lib/storage/files";
import { createDownloadUrl } from "@/lib/storage/supabase";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
    const { id } = await context.params;
    const photo = await prisma.clinicPhoto.findUnique({ where: { id }, select: { storageKey: true } });
    const stored = photo?.storageKey;
    if (!stored || !isSafeObjectKey(stored)) return new Response("Not found", { status: 404 });

    try {
        const signedUrl = await createDownloadUrl(CLINIC_PHOTOS_BUCKET, stored);
        return new Response(null, {
            status: 302,
            headers: { Location: signedUrl, "Cache-Control": "private, no-store" },
        });
    } catch {
        return new Response("Not found", { status: 404 });
    }
}
