import { prisma } from "@/lib/prisma";
import { PRODUCT_PHOTOS_BUCKET, isSafeObjectKey } from "@/lib/storage/files";
import { createDownloadUrl } from "@/lib/storage/supabase";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
    const { id } = await context.params;
    const product = await prisma.product.findUnique({ where: { id }, select: { photoUrl: true } });
    const stored = product?.photoUrl;
    if (!stored || !isSafeObjectKey(stored)) return new Response("Not found", { status: 404 });

    try {
        const signedUrl = await createDownloadUrl(PRODUCT_PHOTOS_BUCKET, stored);
        return new Response(null, {
            status: 302,
            headers: { Location: signedUrl, "Cache-Control": "private, no-store" },
        });
    } catch {
        return new Response("Not found", { status: 404 });
    }
}
