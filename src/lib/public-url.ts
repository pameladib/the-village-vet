// Canonical public origin for links that leave the staff browser:
// owner registration links and the install QR code.
//
// Set APP_URL to the public site origin with no path.
// Production on Vercel: https://the-village-vet.vercel.app
// After the clinic domain is connected, change it to that https address.
// Do not use a Vercel preview URL. This is separate from BETTER_AUTH_URL.
//
// Local development uses http://localhost:3000 when APP_URL is unset.
// Production never invents localhost or a preview host. An unset or invalid
// APP_URL is refused instead.

export function canonicalAppUrl(raw: string | undefined, production: boolean) {
    const configured = raw?.trim();
    if (configured) return originOnly(configured);
    if (!production) return "http://localhost:3000";
    return null;
}

export function publicAppUrl() {
    return canonicalAppUrl(process.env.APP_URL, process.env.NODE_ENV === "production");
}

function originOnly(value: string) {
    let url: URL;
    try {
        url = new URL(value);
    } catch {
        return null;
    }
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (url.username || url.password || url.search || url.hash) return null;
    if (url.pathname !== "/" && url.pathname !== "") return null;
    return url.origin;
}
