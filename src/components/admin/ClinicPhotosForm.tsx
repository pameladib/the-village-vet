"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { clinicHomePhoto, clinicVisitPhoto } from "@/components/public/photos";
import { deleteClinicPhoto, moveClinicPhoto, prepareClinicPhoto, saveClinicPhoto } from "@/lib/actions/clinic";
import type { Copy } from "@/lib/i18n";
import { uploadToSignedUrl } from "@/lib/storage/direct-upload";

type SavedPhoto = {
    id: string;
    kind: "HERO" | "ABOUT" | "GALLERY";
    captionEn: string;
    captionAr: string;
    version: string;
};

function savedSrc(photo: SavedPhoto) {
    return `/clinic-media/${photo.id}?v=${encodeURIComponent(photo.version)}`;
}

function useChosenPicture() {
    const [preview, setPreview] = useState<string | null>(null);
    const [name, setName] = useState<string | null>(null);
    const previewRef = useRef<string | null>(null);

    function choose(file: File | null) {
        if (previewRef.current) URL.revokeObjectURL(previewRef.current);
        const next = file ? URL.createObjectURL(file) : null;
        previewRef.current = next;
        setPreview(next);
        setName(file?.name ?? null);
    }

    useEffect(() => () => {
        if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    }, []);

    return { preview, name, choose };
}

function PictureField({ copy, name, onFile }: { copy: Copy; name: string | null; onFile: (file: File | null) => void }) {
    return (
        <div>
            <label className="relative inline-flex cursor-pointer rounded-full border border-emerald-800 px-4 py-2 text-sm font-medium text-emerald-900 hover:bg-emerald-50 dark:border-emerald-300 dark:text-emerald-100 dark:hover:bg-emerald-950">
                {copy.clinicPhotoChoose}
                <input
                    name="file"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="sr-only"
                    onChange={(event) => onFile(event.target.files?.[0] ?? null)}
                />
            </label>
            {name && <p className="mt-2 text-sm text-stone-500">{name}</p>}
        </div>
    );
}

const field = "mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 outline-none focus:border-emerald-800 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-50";

function messageFor(copy: Copy, message?: string) {
    if (message === "Enter the caption in English and Arabic.") return copy.clinicPhotoNeedCaption;
    if (message === "Choose a picture to upload.") return copy.clinicPhotoNeedFile;
    if (message === "The carousel can hold 8 pictures.") return copy.clinicPhotoLimit;
    return copy.errClinicPhoto;
}

async function storeFile(file: File) {
    const prepared = await prepareClinicPhoto({ contentType: file.type, size: file.size });
    if (!prepared.success) return prepared;
    try {
        await uploadToSignedUrl(prepared.signedUrl, file);
    } catch {
        return { success: false as const, formErrors: ["Could not store the photo."] };
    }
    return { success: true as const, key: prepared.key, contentType: file.type };
}

function Captions({
    copy,
    captionEn,
    captionAr,
}: {
    copy: Copy;
    captionEn: string;
    captionAr: string;
}) {
    return (
        <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-medium text-emerald-950 dark:text-emerald-50">
                {copy.captionEnglish}
                <input name="captionEn" dir="ltr" required defaultValue={captionEn} className={field} />
            </label>
            <label className="text-sm font-medium text-emerald-950 dark:text-emerald-50">
                {copy.captionArabic}
                <input name="captionAr" dir="rtl" required defaultValue={captionAr} className={field} />
            </label>
        </div>
    );
}

export default function ClinicPhotosForm({ copy, photos }: { copy: Copy; photos: SavedPhoto[] }) {
    const router = useRouter();
    const hero = photos.find((photo) => photo.kind === "HERO") ?? null;
    const about = photos.find((photo) => photo.kind === "ABOUT") ?? null;
    const gallery = photos.filter((photo) => photo.kind === "GALLERY");

    return (
        <section className="mt-10 flex flex-col gap-6">
            <div>
                <h2 className="text-lg font-semibold text-emerald-950 dark:text-emerald-50">{copy.clinicPhotos}</h2>
                <p className="mt-1 text-sm leading-6 text-stone-500">{copy.clinicPhotosLead}</p>
            </div>
            <SinglePhoto copy={copy} kind="HERO" title={copy.clinicHero} photo={hero} fallback={clinicVisitPhoto} onDone={() => router.refresh()} />
            <SinglePhoto copy={copy} kind="ABOUT" title={copy.clinicAboutPhoto} photo={about} fallback={clinicHomePhoto} onDone={() => router.refresh()} />
            <div className="rounded-2xl border border-stone-200 p-4 dark:border-stone-700">
                <h3 className="text-sm font-semibold text-emerald-950 dark:text-emerald-50">{copy.clinicCarousel}</h3>
                <p className="mt-1 text-sm leading-6 text-stone-500">{gallery.length === 0 ? copy.clinicCarouselFallback : copy.clinicCarouselLead}</p>
                <div className="mt-4 flex flex-col gap-4">
                    {gallery.map((photo, index) => (
                        <GalleryPhoto
                            key={photo.id}
                            copy={copy}
                            photo={photo}
                            first={index === 0}
                            last={index === gallery.length - 1}
                            onDone={() => router.refresh()}
                        />
                    ))}
                    <AddGalleryPhoto copy={copy} onDone={() => router.refresh()} />
                </div>
            </div>
        </section>
    );
}

function SinglePhoto({
    copy,
    kind,
    title,
    photo,
    fallback,
    onDone,
}: {
    copy: Copy;
    kind: "HERO" | "ABOUT";
    title: string;
    photo: SavedPhoto | null;
    fallback: string;
    onDone: () => void;
}) {
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [pending, setPending] = useState(false);
    const chosen = useChosenPicture();

    return (
        <form
            className="flex flex-col gap-3 rounded-2xl border border-stone-200 p-4 dark:border-stone-700"
            onSubmit={async (event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                const file = form.get("file");
                setPending(true);
                setError(null);
                setMessage(null);
                let storageKey: string | undefined;
                let contentType: string | undefined;
                if (file instanceof File && file.size > 0) {
                    const stored = await storeFile(file);
                    if (!stored.success) {
                        setPending(false);
                        setError(messageFor(copy, stored.formErrors[0]));
                        return;
                    }
                    storageKey = stored.key;
                    contentType = stored.contentType;
                }
                if (!storageKey || !contentType) {
                    setPending(false);
                    setError(copy.clinicPhotoNeedFile);
                    return;
                }
                const result = await saveClinicPhoto({
                    kind,
                    captionEn: "",
                    captionAr: "",
                    storageKey,
                    contentType,
                });
                setPending(false);
                if (!result.success) {
                    setError(messageFor(copy, result.formErrors[0]));
                    return;
                }
                setMessage(copy.clinicPhotoSaved);
                onDone();
            }}
        >
            <h3 className="text-sm font-semibold text-emerald-950 dark:text-emerald-50">{title}</h3>
            <div className="relative h-40 overflow-hidden rounded-xl bg-stone-100">
                <img src={chosen.preview ?? (photo ? savedSrc(photo) : fallback)} alt="" className="size-full object-cover" />
            </div>
            {!photo && !chosen.preview && <p className="text-sm text-stone-500">{copy.clinicPhotoFallback}</p>}
            <PictureField copy={copy} name={chosen.name} onFile={chosen.choose} />
            {error && <p className="text-sm text-red-700">{error}</p>}
            {message && <p className="text-sm text-emerald-800">{message}</p>}
            <div className="flex flex-wrap gap-2">
                <button type="submit" disabled={pending} className="rounded-full bg-emerald-900 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-950 disabled:opacity-60">
                    {copy.clinicPhotoSave}
                </button>
                {photo && (
                    <button
                        type="button"
                        disabled={pending}
                        className="rounded-full border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-60 dark:border-stone-600 dark:text-stone-200"
                        onClick={async () => {
                            setPending(true);
                            const result = await deleteClinicPhoto(photo.id);
                            setPending(false);
                            if (!result.success) {
                                setError(messageFor(copy, result.formErrors[0]));
                                return;
                            }
                            setMessage(copy.clinicPhotoRemoved);
                            onDone();
                        }}
                    >
                        {copy.clinicPhotoRemove}
                    </button>
                )}
            </div>
        </form>
    );
}

function GalleryPhoto({
    copy,
    photo,
    first,
    last,
    onDone,
}: {
    copy: Copy;
    photo: SavedPhoto;
    first: boolean;
    last: boolean;
    onDone: () => void;
}) {
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [pending, setPending] = useState(false);
    const chosen = useChosenPicture();

    return (
        <form
            className="flex flex-col gap-3 rounded-xl bg-stone-50 p-3 dark:bg-stone-950"
            onSubmit={async (event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                const file = form.get("file");
                setPending(true);
                setError(null);
                setMessage(null);
                let storageKey: string | undefined;
                let contentType: string | undefined;
                if (file instanceof File && file.size > 0) {
                    const stored = await storeFile(file);
                    if (!stored.success) {
                        setPending(false);
                        setError(messageFor(copy, stored.formErrors[0]));
                        return;
                    }
                    storageKey = stored.key;
                    contentType = stored.contentType;
                }
                const result = await saveClinicPhoto({
                    id: photo.id,
                    kind: "GALLERY",
                    captionEn: String(form.get("captionEn") ?? ""),
                    captionAr: String(form.get("captionAr") ?? ""),
                    storageKey,
                    contentType,
                });
                setPending(false);
                if (!result.success) {
                    setError(messageFor(copy, result.formErrors[0]));
                    return;
                }
                setMessage(copy.clinicPhotoSaved);
                onDone();
            }}
        >
            <div className="relative h-32 overflow-hidden rounded-lg bg-stone-200">
                <img src={chosen.preview ?? savedSrc(photo)} alt="" className="size-full object-cover" />
            </div>
            <Captions copy={copy} captionEn={photo.captionEn} captionAr={photo.captionAr} />
            <PictureField copy={copy} name={chosen.name} onFile={chosen.choose} />
            {error && <p className="text-sm text-red-700">{error}</p>}
            {message && <p className="text-sm text-emerald-800">{message}</p>}
            <div className="flex flex-wrap gap-2">
                <button type="submit" disabled={pending} className="rounded-full bg-emerald-900 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-950 disabled:opacity-60">
                    {copy.clinicPhotoSave}
                </button>
                <button type="button" disabled={pending || first} onClick={async () => { await moveClinicPhoto(photo.id, -1); onDone(); }} className="rounded-full border border-stone-300 px-3 py-2 text-sm disabled:opacity-40 dark:border-stone-600">
                    {copy.clinicPhotoUp}
                </button>
                <button type="button" disabled={pending || last} onClick={async () => { await moveClinicPhoto(photo.id, 1); onDone(); }} className="rounded-full border border-stone-300 px-3 py-2 text-sm disabled:opacity-40 dark:border-stone-600">
                    {copy.clinicPhotoDown}
                </button>
                <button
                    type="button"
                    disabled={pending}
                    onClick={async () => {
                        setPending(true);
                        const result = await deleteClinicPhoto(photo.id);
                        setPending(false);
                        if (!result.success) {
                            setError(messageFor(copy, result.formErrors[0]));
                            return;
                        }
                        onDone();
                    }}
                    className="rounded-full border border-stone-300 px-3 py-2 text-sm dark:border-stone-600"
                >
                    {copy.clinicPhotoRemove}
                </button>
            </div>
        </form>
    );
}

function AddGalleryPhoto({ copy, onDone }: { copy: Copy; onDone: () => void }) {
    const [error, setError] = useState<string | null>(null);
    const [pending, setPending] = useState(false);
    const chosen = useChosenPicture();

    return (
        <form
            className="flex flex-col gap-3 rounded-xl border border-dashed border-stone-300 p-3 dark:border-stone-600"
            onSubmit={async (event) => {
                event.preventDefault();
                const form = event.currentTarget;
                const data = new FormData(form);
                const file = data.get("file");
                setPending(true);
                setError(null);
                if (!(file instanceof File) || file.size === 0) {
                    setPending(false);
                    setError(copy.clinicPhotoNeedFile);
                    return;
                }
                const stored = await storeFile(file);
                if (!stored.success) {
                    setPending(false);
                    setError(messageFor(copy, stored.formErrors[0]));
                    return;
                }
                const result = await saveClinicPhoto({
                    kind: "GALLERY",
                    captionEn: String(data.get("captionEn") ?? ""),
                    captionAr: String(data.get("captionAr") ?? ""),
                    storageKey: stored.key,
                    contentType: stored.contentType,
                });
                setPending(false);
                if (!result.success) {
                    setError(messageFor(copy, result.formErrors[0]));
                    return;
                }
                form.reset();
                chosen.choose(null);
                onDone();
            }}
        >
            <p className="text-sm font-medium text-emerald-950 dark:text-emerald-50">{copy.clinicPhotoAdd}</p>
            {chosen.preview && (
                <div className="relative h-32 overflow-hidden rounded-lg bg-stone-200">
                    <img src={chosen.preview} alt="" className="size-full object-cover" />
                </div>
            )}
            <Captions copy={copy} captionEn="" captionAr="" />
            <PictureField copy={copy} name={chosen.name} onFile={chosen.choose} />
            {error && <p className="text-sm text-red-700">{error}</p>}
            <button type="submit" disabled={pending} className="w-fit rounded-full bg-emerald-900 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-950 disabled:opacity-60">
                {copy.clinicPhotoAdd}
            </button>
        </form>
    );
}
