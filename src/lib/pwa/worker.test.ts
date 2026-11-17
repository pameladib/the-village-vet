import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { createContext, runInContext } from "node:vm";
import { describe, it } from "node:test";

const root = path.resolve(import.meta.dirname, "../../..");
const worker = readFileSync(path.join(root, "public/sw.js"), "utf8");
const offline = readFileSync(path.join(root, "public/offline.html"), "utf8");
const copy = readFileSync(path.join(root, "src/lib/i18n.ts"), "utf8");

function loadPolicy() {
    const start = worker.indexOf("const privatePrefixes");
    const end = worker.indexOf("function cacheStaticAssets");
    const sandbox: { isPrivatePath?: (value: string) => boolean; isStaticAsset?: (value: string) => boolean; safePath?: (value: string) => string } = {};
    const safe = worker.match(/function safePath\([\s\S]*?\n\}/);
    assert.ok(start >= 0 && end > start && safe);
    runInContext(`${worker.slice(start, end)}\n${safe[0]}\nthis.isPrivatePath = isPrivatePath;\nthis.isStaticAsset = isStaticAsset;\nthis.safePath = safePath;`, createContext(sandbox));
    return sandbox as { isPrivatePath: (value: string) => boolean; isStaticAsset: (value: string) => boolean; safePath: (value: string) => string };
}

describe("service worker cache policy", () => {
    const { isPrivatePath, isStaticAsset, safePath } = loadPolicy();

    it("treats records, sessions, and orders as private", () => {
        for (const pathName of ["/dashboard", "/admin/orders/1", "/pets/abc/documents/1", "/account/password", "/profile", "/appointments/new", "/login", "/api/auth/session", "/shop/orders", "/shop/checkout", "/shop/cart", "/shop/media/1"]) {
            assert.equal(isPrivatePath(pathName), true, pathName);
            assert.equal(isStaticAsset(pathName), false, pathName);
        }
    });

    it("caches only public static files", () => {
        assert.equal(isStaticAsset("/_next/static/chunks/app.js"), true);
        assert.equal(isStaticAsset("/images/shop/shop-dog-kibble.jpg"), true);
        assert.equal(isStaticAsset("/icon-192.png"), true);
        assert.equal(isStaticAsset("/offline.html"), true);
        assert.equal(isStaticAsset("/clinic-media/1"), false);
        assert.equal(isStaticAsset("/shop"), false);
        assert.equal(isStaticAsset("/"), false);
        assert.equal(isPrivatePath("/shop"), false);
        assert.equal(isPrivatePath("/"), false);
    });

    it("keeps notification clicks inside the app", () => {
        assert.equal(safePath("/shop/orders"), "/shop/orders");
        assert.equal(safePath("https://example.com"), "/dashboard");
        assert.equal(safePath("//example.com"), "/dashboard");
    });

    it("waits for the user before activating an update", () => {
        assert.equal(worker.includes("self.skipWaiting()"), true);
        assert.equal(worker.includes('event.data?.type === "SKIP_WAITING"'), true);
        assert.equal(worker.includes("cache.put"), true);
        assert.equal(worker.includes("request.mode === \"navigate\""), true);
    });

    it("uses the same offline copy as the translations", () => {
        assert.equal(offline.includes("You are offline"), true);
        assert.equal(offline.includes("أنتم غير متصلين"), true);
        assert.equal(copy.includes("You are offline"), true);
        assert.equal(copy.includes("أنتم غير متصلين"), true);
    });
});
