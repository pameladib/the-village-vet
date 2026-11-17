import { cache } from "react";
import { clinicGallery, clinicHomePhoto, clinicVisitPhoto } from "@/components/public/photos";
import type { Copy, Locale } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";

export const getClinicSettings = cache(() =>
    prisma.clinicSetting.findUnique({ where: { id: "clinic" } }),
);

export type PublicPhoto = { src: string; alt: string };
export type GallerySlide = { src: string; caption: string };

const stockHero = {
    src: clinicVisitPhoto,
    altEn: "A veterinarian in a white coat holding a cat in a bright room.",
    altAr: "طبيبة بيطرية بمعطف أبيض تحمل قطة في غرفة مضيئة.",
};
const stockAbout = {
    src: clinicHomePhoto,
    altEn: "A golden puppy running across a lawn.",
    altAr: "جرْو ذهبي يركض على العشب.",
};

function publishedSrc(row: { id: string; storageKey: string }) {
    const version = row.storageKey.split("/").pop() ?? row.id;
    return `/clinic-media/${row.id}?v=${encodeURIComponent(version)}`;
}

function captionFor(row: { captionEn: string; captionAr: string }, locale: Locale, fallback: string) {
    const preferred = locale === "ar" ? row.captionAr : row.captionEn;
    const other = locale === "ar" ? row.captionEn : row.captionAr;
    return preferred.trim() || other.trim() || fallback;
}

export async function getPublicPhotos(locale: Locale, copy: Copy): Promise<{ hero: PublicPhoto; about: PublicPhoto; gallery: GallerySlide[] }> {
    const rows = await prisma.clinicPhoto.findMany({ orderBy: [{ position: "asc" }, { createdAt: "asc" }] });
    const hero = rows.find((row) => row.kind === "HERO");
    const about = rows.find((row) => row.kind === "ABOUT");
    const slides = rows.filter((row) => row.kind === "GALLERY");
    return {
        hero: {
            src: hero ? publishedSrc(hero) : stockHero.src,
            alt: locale === "ar" ? stockHero.altAr : stockHero.altEn,
        },
        about: {
            src: about ? publishedSrc(about) : stockAbout.src,
            alt: locale === "ar" ? stockAbout.altAr : stockAbout.altEn,
        },
        gallery: slides.length > 0
            ? slides.map((slide) => ({ src: publishedSrc(slide), caption: captionFor(slide, locale, "") }))
            : clinicGallery.map((photo) => ({ src: photo.src, caption: copy[photo.caption] })),
    };
}

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
    if (path.startsWith("/appointments") || path.startsWith("/dashboard") || path.startsWith("/pets") || path.startsWith("/shop") || path.startsWith("/profile")) return value;
    return "/dashboard";
}
