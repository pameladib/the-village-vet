"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createVisitFollowUp, searchFollowUpPets } from "@/lib/actions/follow-ups";
import { ownerChat } from "@/lib/clinic/phone";
import type { Copy } from "@/lib/i18n";

type PetHit = { id: string; name: string; owner: { id: string; name: string; phoneNumber: string } };

function SelectedOwner({ owner }: { owner: PetHit["owner"] }) {
    const chat = ownerChat(owner.phoneNumber);
    return (
        <p className="mt-1 text-xs text-stone-500">
            <Link href={`/admin/owners/${owner.id}`} className="font-medium text-emerald-900 hover:underline dark:text-emerald-200">{owner.name}</Link>
            {chat ? <>{" · "}<a href={chat} target="_blank" rel="noopener noreferrer" className="font-medium text-emerald-900 hover:underline dark:text-emerald-200">{owner.phoneNumber}</a></> : null}
        </p>
    );
}

const field = "mt-1 w-full min-w-0 rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-50";
const solid = "rounded-full bg-emerald-900 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-950 disabled:opacity-60";
const quiet = "rounded-full border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:border-emerald-700 disabled:opacity-60 dark:border-stone-600 dark:text-stone-200";

export default function AddFollowUp({ copy, today }: { copy: Copy; today: string }) {
    const router = useRouter();
    const [query, setQuery] = useState("");
    const [pets, setPets] = useState<PetHit[]>([]);
    const [menu, setMenu] = useState(false);
    const [pet, setPet] = useState<PetHit | null>(null);
    const [date, setDate] = useState("");
    const [notes, setNotes] = useState("");
    const [pending, setPending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const box = useRef<HTMLDivElement>(null);
    const request = useRef(0);
    const previous = useRef("");

    useEffect(() => {
        function close(event: PointerEvent) {
            if (!box.current?.contains(event.target as Node)) setMenu(false);
        }
        document.addEventListener("pointerdown", close);
        return () => document.removeEventListener("pointerdown", close);
    }, []);

    function lookUp(value: string) {
        setQuery(value);
        setPet(null);
        const q = value.trim();
        const last = previous.current;
        previous.current = q;
        if (!q) {
            request.current += 1;
            setPets([]);
            setMenu(false);
            return;
        }
        setMenu(true);
        if (last && (q.startsWith(last) || last.startsWith(q))) {
            const needle = q.toLowerCase();
            setPets((current) => current.filter((item) => item.name.toLowerCase().includes(needle) || item.owner.name.toLowerCase().includes(needle)));
        } else {
            setPets([]);
        }
        const id = ++request.current;
        void searchFollowUpPets(q).then((found) => {
            if (request.current !== id) return;
            setPets(found);
        });
    }

    async function save() {
        setError(null);
        if (!pet) {
            setError(copy.followUpChoosePet);
            return;
        }
        if (date < today) {
            setError(copy.followUpDateError);
            return;
        }
        setPending(true);
        const result = await createVisitFollowUp({ petId: pet.id, date, notes });
        setPending(false);
        if (!result.success) {
            setError(result.error === "date" ? copy.followUpDateError : result.error === "notes" ? copy.followUpNoteLong : result.error === "pet" ? copy.followUpChoosePet : copy.visitSaveError);
            return;
        }
        router.push(`/admin/follow-ups?tab=${result.tab}&added=${result.id}`);
    }

    return (
        <form
            className="mt-6 grid gap-3"
            onSubmit={(event) => {
                event.preventDefault();
                void save();
            }}
        >
            <div ref={box} className="relative">
                <label className="block text-sm text-stone-600 dark:text-stone-300">
                    {copy.followUpPet}
                    <input
                        value={pet ? pet.name : query}
                        autoComplete="off"
                        role="combobox"
                        aria-expanded={menu && pets.length > 0}
                        placeholder={copy.followUpFindPet}
                        onChange={(event) => lookUp(event.target.value)}
                        onFocus={() => { if (!pet && query.trim() && pets.length > 0) setMenu(true); }}
                        className={field}
                    />
                </label>
                {menu && pets.length > 0 && (
                    <ul className="absolute inset-x-0 top-full z-20 mt-1 max-h-60 overflow-auto rounded-xl border border-stone-200 bg-white shadow-lg dark:border-stone-700 dark:bg-stone-900">
                        {pets.map((item) => (
                            <li key={item.id}>
                                <button
                                    type="button"
                                    onMouseDown={(event) => event.preventDefault()}
                                    onClick={() => { setPet(item); setQuery(""); setPets([]); setMenu(false); previous.current = ""; }}
                                    className="flex w-full min-w-0 flex-col px-3 py-2 text-start hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                                >
                                    <span className="truncate text-sm font-medium text-stone-900 dark:text-stone-50">{item.name}</span>
                                    <span className="truncate text-xs text-stone-500">{item.owner.name}</span>
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
                {pet && <SelectedOwner owner={pet.owner} />}
            </div>
            <label className="block text-sm text-stone-600 dark:text-stone-300">
                {copy.followUpDate}
                <input type="date" required min={today} value={date} onChange={(event) => setDate(event.target.value)} className={field} />
            </label>
            <label className="block text-sm text-stone-600 dark:text-stone-300">
                {copy.followUpNotes}
                <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} className={field} />
            </label>
            {error && <p className="text-sm text-red-700 dark:text-red-300">{error}</p>}
            <div className="flex flex-wrap gap-2">
                <button type="submit" disabled={pending} className={solid}>{copy.followUpSave}</button>
                <Link href="/admin/follow-ups" className={quiet}>{copy.followUpFormCancel}</Link>
            </div>
        </form>
    );
}
