const CACHE = "village-vet-static-v2";
const PRECACHE = ["/offline.html", "/icon-192.png", "/icon-512.png", "/icon-maskable-512.png", "/apple-touch-icon.png"];

const privatePrefixes = [
    "/api/",
    "/dashboard",
    "/admin",
    "/pets",
    "/account",
    "/profile",
    "/appointments",
    "/login",
    "/sign-up",
    "/setup-account",
    "/shop/orders",
    "/shop/checkout",
    "/shop/cart",
    "/shop/media",
];

function isPrivatePath(pathname) {
    return privatePrefixes.some((prefix) => pathname === prefix || pathname.startsWith(prefix.endsWith("/") ? prefix : `${prefix}/`) || pathname === prefix);
}

function isStaticAsset(pathname) {
    if (isPrivatePath(pathname)) return false;
    return pathname.startsWith("/_next/static/")
        || pathname.startsWith("/images/")
        || pathname.startsWith("/icon-")
        || pathname === "/apple-touch-icon.png"
        || pathname === "/offline.html";
}

function cacheStaticAssets() {
    return self.location.hostname !== "localhost" && self.location.hostname !== "127.0.0.1";
}

function safePath(value) {
    if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || value.includes("://") || value.includes("\\")) return "/dashboard";
    return value;
}

self.addEventListener("install", (event) => {
    event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)));
});

self.addEventListener("activate", (event) => {
    event.waitUntil((async () => {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
        const cache = await caches.open(CACHE);
        await cache.addAll(PRECACHE);
        await self.clients.claim();
    })());
});

self.addEventListener("message", (event) => {
    if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

async function networkOrOffline(request) {
    try {
        return await fetch(request);
    } catch {
        const cache = await caches.open(CACHE);
        return (await cache.match("/offline.html")) || new Response("Offline", { status: 503, headers: { "Content-Type": "text/plain" } });
    }
}

async function cacheFirst(request) {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(request);
    if (cached) return cached;
    const response = await fetch(request);
    if (response.ok && response.type === "basic") await cache.put(request, response.clone());
    return response;
}

self.addEventListener("fetch", (event) => {
    const request = event.request;
    if (request.method !== "GET") return;
    const url = new URL(request.url);
    if (url.origin !== self.location.origin) return;

    if (request.mode === "navigate") {
        event.respondWith(networkOrOffline(request));
        return;
    }

    if (!cacheStaticAssets() || !isStaticAsset(url.pathname)) return;
    event.respondWith(cacheFirst(request));
});

self.addEventListener("push", (event) => {
    const data = event.data ? event.data.json() : {};
    const title = typeof data.title === "string" && data.title ? data.title : "The Village Vet";
    const body = typeof data.body === "string" ? data.body : "";
    event.waitUntil(self.registration.showNotification(title, {
        body,
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        data: { href: safePath(data.href) },
    }));
});

self.addEventListener("notificationclick", (event) => {
    event.notification.close();
    const target = safePath(event.notification.data?.href);
    event.waitUntil((async () => {
        const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
        for (const client of windows) {
            if (new URL(client.url).origin !== self.location.origin) continue;
            await client.focus();
            if ("navigate" in client) return client.navigate(target);
        }
        return self.clients.openWindow(target);
    })());
});
