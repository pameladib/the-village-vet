import { cache } from "react";
import { prisma } from "@/lib/prisma";

export const getClinicSettings = cache(() =>
    prisma.clinicSetting.findUnique({ where: { id: "clinic" } }),
);

export function phoneHref(value: string) {
    const compact = value.replace(/[^\d+]/g, "");
    return compact.length >= 8 ? `tel:${compact}` : null;
}

// Prefer a pin in the saved map link. The clinic's short link has no coordinates in the URL itself.
export function clinicMapEmbed(locale: "en" | "ar", mapsUrl: string | null | undefined, address: string | null | undefined) {
    const pin = coordinatesIn(mapsUrl) ?? (mapsUrl?.includes("VgbXYipPXhcg4y8i8") ? "34.4176220,35.9488410" : null);
    const query = pin ?? address?.trim();
    if (!query) return null;
    const params = new URLSearchParams({
        q: query,
        z: "16",
        hl: locale,
        output: "embed",
    });
    return `https://www.google.com/maps?${params.toString()}`;
}

function coordinatesIn(url: string | null | undefined) {
    if (!url) return null;
    const match = url.match(/@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/) ?? url.match(/[?&]q=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/);
    return match ? `${match[1]},${match[2]}` : null;
}

export function whatsappHref(value: string) {
    const digits = value.replace(/\D/g, "");
    return digits.length >= 8 ? `https://wa.me/${digits}` : null;
}

// Only in-app paths the public site is allowed to send someone to after login.
export function returnPath(value: string | undefined) {
    if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("://")) return "/dashboard";
    const path = value.split("?")[0];
    if (path.startsWith("/appointments") || path.startsWith("/dashboard") || path.startsWith("/pets") || path.startsWith("/shop")) return value;
    return "/dashboard";
}
