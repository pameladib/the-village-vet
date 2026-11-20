const recordId = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isRecordId(value: string) {
    return recordId.test(value);
}

// Keeps letters from any language, so an Arabic pet name stays readable in the address.
export function slugify(value: string, fallback = "item") {
    const cleaned = value
        .normalize("NFKC")
        .trim()
        .toLowerCase()
        .replace(/['’]/g, "")
        .replace(/[^\p{L}\p{N}]+/gu, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 72)
        .replace(/-+$/g, "");
    return cleaned || fallback;
}

export function refWhere(ref: string): { id: string } | { slug: string } {
    return isRecordId(ref) ? { id: ref } : { slug: ref };
}

export function pageKey(record: { id: string; slug?: string | null }) {
    return record.slug || record.id;
}
