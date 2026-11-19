"use client";

import Link from "next/link";
import SpeciesMark from "@/components/pets/SpeciesMark";
import { ownerChat } from "@/lib/clinic/phone";

export default function PatientCard({
    petHref,
    ownerHref,
    name,
    species,
    speciesLabel,
    breed,
    ownerLabel,
    ownerName,
    phoneLabel,
    phone,
}: {
    petHref: string;
    ownerHref: string;
    name: string;
    species: "CAT" | "DOG";
    speciesLabel: string;
    breed: string;
    ownerLabel: string;
    ownerName: string;
    phoneLabel: string;
    phone: string;
}) {
    const chat = ownerChat(phone);
    return (
        <li className="relative cursor-pointer rounded-2xl border border-stone-200 bg-white px-3 py-3 transition hover:border-emerald-300 hover:bg-emerald-50/70 hover:shadow-sm focus-within:border-emerald-700 dark:border-stone-800 dark:bg-stone-900 dark:hover:border-emerald-800 dark:hover:bg-emerald-950/30 sm:px-4">
            <Link href={petHref} aria-label={`${name}, ${speciesLabel}`} className="absolute inset-0 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700" />
            <div className="pointer-events-none relative flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                    <SpeciesMark species={species} className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-semibold text-emerald-950 dark:text-emerald-50">{name}</p>
                    <p className="truncate text-sm text-stone-600 dark:text-stone-300">
                        {speciesLabel}
                        {breed ? ` · ${breed}` : ""}
                    </p>
                    <p className="mt-1 truncate text-sm text-stone-500">
                        {ownerLabel}:{" "}
                        <Link
                            href={ownerHref}
                            onClick={(event) => event.stopPropagation()}
                            className="pointer-events-auto relative z-10 font-medium text-emerald-900 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 dark:text-emerald-200"
                        >
                            {ownerName}
                        </Link>
                    </p>
                    <p className="truncate text-sm text-stone-500">
                        {phoneLabel}:{" "}
                        {chat ? (
                            <a
                                href={chat}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(event) => event.stopPropagation()}
                                className="pointer-events-auto relative z-10 font-medium text-emerald-900 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 dark:text-emerald-200"
                            >
                                {phone}
                            </a>
                        ) : phone}
                    </p>
                </div>
            </div>
        </li>
    );
}
