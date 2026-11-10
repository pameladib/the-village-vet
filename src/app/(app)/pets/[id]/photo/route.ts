import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/session";
import { photoRequestStatus } from "@/lib/auth/permissions";
import { PET_PHOTOS_BUCKET, isSafeObjectKey } from "@/lib/storage/files";
import { createDownloadUrl } from "@/lib/storage/supabase";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
    const { id } = await context.params;
    let session;
    try {
        session = await requireAuth();
    } catch {
        session = null;
    }

    const pet = session
        ? await prisma.pet.findUnique({
            where: { id },
            select: { ownerId: true, photoUrl: true },
        })
        : null;

    const status = photoRequestStatus({
        signedIn: Boolean(session),
        role: session?.user.role ?? "",
        userId: session?.user.id ?? "",
        pet,
    });
    if (status !== 200 || !pet?.photoUrl) {
        return new Response(status === 401 ? "Sign in required" : status === 404 ? "Not found" : "Not available", { status });
    }

    const stored = pet.photoUrl;
    if (!stored || !isSafeObjectKey(stored) || !stored.startsWith(`${id.toLowerCase()}/`)) return new Response("Not found", { status: 404 });

    try {
        const signedUrl = await createDownloadUrl(PET_PHOTOS_BUCKET, stored);
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
