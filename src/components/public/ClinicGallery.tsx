"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { clinicGallery } from "@/components/public/photos";
import type { Copy, Locale } from "@/lib/i18n";

const INTERVAL_MS = 4500;
const SWIPE_PX = 40;

export default function ClinicGallery({ copy, locale }: { copy: Copy; locale: Locale }) {
    const rtl = locale === "ar";
    const count = clinicGallery.length;
    const [index, setIndex] = useState(0);
    const [hovered, setHovered] = useState(false);
    const [focused, setFocused] = useState(false);
    const [touched, setTouched] = useState(false);
    const [reduceMotion, setReduceMotion] = useState(false);
    const [ready, setReady] = useState(false);
    const [touchStart, setTouchStart] = useState<number | null>(null);

    useEffect(() => {
        const media = window.matchMedia("(prefers-reduced-motion: reduce)");
        const apply = () => setReduceMotion(media.matches);
        apply();
        setReady(true);
        media.addEventListener("change", apply);
        return () => media.removeEventListener("change", apply);
    }, []);

    const paused = hovered || focused || touched;

    useEffect(() => {
        if (!ready || paused || reduceMotion) return;
        const id = window.setTimeout(() => {
            setIndex((current) => (current + 1) % count);
        }, INTERVAL_MS);
        return () => window.clearTimeout(id);
    }, [ready, paused, reduceMotion, count, index]);

    function step(delta: number) {
        setIndex((current) => (current + delta + count) % count);
    }

    function onTouchEnd(clientX: number) {
        if (touchStart == null) return;
        const delta = clientX - touchStart;
        setTouchStart(null);
        setTouched(false);
        if (delta <= -SWIPE_PX) step(rtl ? -1 : 1);
        if (delta >= SWIPE_PX) step(rtl ? 1 : -1);
    }

    // Arabic lays the row out from the right, so the track moves the opposite way.
    const shift = { transform: `translate3d(${rtl ? index * 100 : -index * 100}%, 0, 0)` };
    const motion = reduceMotion ? "flex" : "flex transition-transform duration-700 ease-in-out";

    return (
        <section
            className="bg-stone-50"
            aria-roledescription="carousel"
            aria-label={copy.galleryHeading}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onFocus={() => setFocused(true)}
            onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
            }}
            onKeyDown={(event) => {
                if (event.key === "ArrowLeft") {
                    event.preventDefault();
                    step(rtl ? 1 : -1);
                }
                if (event.key === "ArrowRight") {
                    event.preventDefault();
                    step(rtl ? -1 : 1);
                }
            }}
        >
            <div className="mx-auto w-full max-w-6xl px-5 py-20">
                <div className="mx-auto max-w-2xl text-center">
                    <h2 className="text-4xl text-emerald-950">{copy.galleryHeading}</h2>
                    <p className="mt-4 text-base leading-7 text-stone-600">{copy.galleryLead}</p>
                </div>

                <div className="relative mt-10">
                    <div
                        className="touch-pan-y overflow-hidden rounded-2xl"
                        onTouchStart={(event) => {
                            setTouched(true);
                            setTouchStart(event.touches[0].clientX);
                        }}
                        onTouchEnd={(event) => onTouchEnd(event.changedTouches[0].clientX)}
                        onTouchCancel={() => {
                            setTouchStart(null);
                            setTouched(false);
                        }}
                    >
                        <div className={motion} style={shift}>
                            {clinicGallery.map((photo, photoIndex) => (
                                <div key={photo.src} className="relative aspect-video w-full shrink-0 bg-stone-200" aria-hidden={photoIndex !== index}>
                                    <Image
                                        src={photo.src}
                                        alt=""
                                        fill
                                        sizes="(min-width: 1152px) 72rem, 100vw"
                                        className="object-cover"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                    <button
                        type="button"
                        className={`absolute top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-emerald-950 shadow-sm ring-1 ring-stone-200 hover:bg-white ${rtl ? "right-3" : "left-3"}`}
                        aria-label={copy.galleryPrevious}
                        onClick={() => step(-1)}
                    >
                        {rtl ? <ChevronRight aria-hidden className="h-5 w-5" /> : <ChevronLeft aria-hidden className="h-5 w-5" />}
                    </button>
                    <button
                        type="button"
                        className={`absolute top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-emerald-950 shadow-sm ring-1 ring-stone-200 hover:bg-white ${rtl ? "left-3" : "right-3"}`}
                        aria-label={copy.galleryNext}
                        onClick={() => step(1)}
                    >
                        {rtl ? <ChevronLeft aria-hidden className="h-5 w-5" /> : <ChevronRight aria-hidden className="h-5 w-5" />}
                    </button>
                </div>

                <div className="overflow-hidden">
                    <div className={motion} style={shift}>
                        {clinicGallery.map((photo, photoIndex) => (
                            <p
                                key={photo.caption}
                                className="w-full shrink-0 pt-4 text-center text-lg text-emerald-950"
                                aria-hidden={photoIndex !== index}
                            >
                                {copy[photo.caption]}
                            </p>
                        ))}
                    </div>
                </div>

                <div className="mt-5 flex items-center justify-center gap-2">
                    {clinicGallery.map((photo, photoIndex) => (
                        <button
                            key={photo.src}
                            type="button"
                            aria-label={copy.galleryPhoto.replace("{n}", String(photoIndex + 1))}
                            aria-current={photoIndex === index ? "true" : undefined}
                            className={photoIndex === index ? "h-2 w-6 rounded-full bg-emerald-900" : "h-2 w-2 rounded-full bg-stone-300 hover:bg-stone-400"}
                            onClick={() => setIndex(photoIndex)}
                        />
                    ))}
                </div>
            </div>
        </section>
    );
}
