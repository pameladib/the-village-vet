import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { isSafeObjectKey } from "./files";

export class StorageNotConfiguredError extends Error {
    constructor() {
        super("File storage is not set up yet.");
        this.name = "StorageNotConfiguredError";
    }
}

let client: SupabaseClient | null = null;

function storageEnv() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SECRET_KEY;
    if (!url || !key) throw new StorageNotConfiguredError();
    return { url, key };
}

export async function ensurePrivateBucket(bucket: string) {
    const storage = serviceClient().storage;
    const existing = await storage.getBucket(bucket);
    if (existing.data) return;
    const created = await storage.createBucket(bucket, { public: false });
    if (created.error) {
        const again = await storage.getBucket(bucket);
        if (!again.data) throw new Error("Could not prepare the upload.");
    }
}

function serviceClient() {
    const { url, key } = storageEnv();
    if (!client) {
        client = createClient(url, key, {
            auth: { persistSession: false, autoRefreshToken: false },
        });
    }
    return client;
}

// The token in this URL can upload that one object for about two hours. upsert is off, so it cannot replace an existing object.
export async function createUploadUrl(bucket: string, key: string) {
    const { data, error } = await serviceClient().storage.from(bucket).createSignedUploadUrl(key, { upsert: false });
    if (error || !data?.signedUrl) throw new Error("Could not prepare the upload.");
    return data.signedUrl;
}

// Short enough that a copied link stops working quickly. The browser follows it straight to Supabase.
export async function createDownloadUrl(bucket: string, key: string, downloadName?: string) {
    const { data, error } = await serviceClient().storage.from(bucket).createSignedUrl(
        key,
        60,
        downloadName ? { download: downloadName } : undefined,
    );
    if (error || !data?.signedUrl) throw new Error("Could not open the file.");
    return data.signedUrl;
}

export async function removeStoredObject(bucket: string, key: string) {
    if (!isSafeObjectKey(key)) throw new Error("Could not remove the file.");
    const { error } = await serviceClient().storage.from(bucket).remove([key]);
    if (error) throw new Error("Could not remove the file.");
}

// Size plus the first bytes, so a 10 MB document is not loaded into the server to be checked.
export async function readStoredPrefix(bucket: string, key: string) {
    if (!isSafeObjectKey(key)) return null;
    const { url, key: serviceKey } = storageEnv();
    const objectUrl = `${url}/storage/v1/object/${bucket}/${key.split("/").map(encodeURIComponent).join("/")}`;
    const response = await fetch(objectUrl, {
        headers: {
            Authorization: `Bearer ${serviceKey}`,
            apikey: serviceKey,
            Range: "bytes=0-31",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(20_000),
    });
    if (response.status !== 200 && response.status !== 206) {
        await response.body?.cancel().catch(() => undefined);
        return null;
    }

    const reader = response.body?.getReader();
    if (!reader) return null;
    const prefix = new Uint8Array(32);
    let received = 0;
    while (received < prefix.byteLength) {
        const { done, value } = await reader.read();
        if (done || !value) break;
        const take = Math.min(value.byteLength, prefix.byteLength - received);
        prefix.set(value.subarray(0, take), received);
        received += take;
    }
    await reader.cancel().catch(() => undefined);

    const rangeTotal = response.headers.get("content-range")?.split("/")[1];
    const sizeText = rangeTotal && rangeTotal !== "*" ? rangeTotal : response.headers.get("content-length");
    const size = Number(sizeText);
    if (!sizeText || !Number.isInteger(size) || size < 0) return null;

    const contentType = response.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase() ?? "";
    return { size, contentType, prefix: prefix.subarray(0, received) };
}
