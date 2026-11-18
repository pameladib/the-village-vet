import assert from "node:assert/strict";
import test from "node:test";
import { canonicalAppUrl } from "./public-url.ts";

test("uses a configured public origin and drops a trailing slash", () => {
    assert.equal(canonicalAppUrl("https://the-village-vet.vercel.app/", true), "https://the-village-vet.vercel.app");
    assert.equal(canonicalAppUrl("http://localhost:3000", false), "http://localhost:3000");
});

test("refuses a path, a preview-style path, or a missing production address", () => {
    assert.equal(canonicalAppUrl("https://example.com/install", true), null);
    assert.equal(canonicalAppUrl("   ", true), null);
    assert.equal(canonicalAppUrl(undefined, true), null);
});

test("local development falls back to localhost only outside production", () => {
    assert.equal(canonicalAppUrl(undefined, false), "http://localhost:3000");
});
