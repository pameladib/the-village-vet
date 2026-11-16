// The signed URL already carries the upload token. This file must not use the service-role key.
// The request matches Supabase's uploadToSignedUrl: a PUT of form data, with upsert turned off.
export async function uploadToSignedUrl(signedUrl: string, file: File) {
    const body = new FormData();
    body.append("cacheControl", "3600");
    body.append("", file);
    const response = await fetch(signedUrl, {
        method: "PUT",
        headers: { "x-upsert": "false" },
        body,
        signal: AbortSignal.timeout(60_000),
    });
    if (!response.ok) throw new Error("Could not store the file.");
}
