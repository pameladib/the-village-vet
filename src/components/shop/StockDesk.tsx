"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { correctStock, receiveStock, setLowStockThreshold, writeOffStock } from "@/lib/actions/inventory";
import type { Copy } from "@/lib/i18n";

type Mode = "receive" | "damage" | "correct";

function failureText(error: string, copy: Copy) {
    if (error === "not-enough") return copy.invNotEnough;
    if (error === "count-low") return copy.invCountLow;
    if (error === "forbidden") return copy.invDenied;
    return copy.invFailed;
}

export default function StockDesk({ productId, threshold, copy }: { productId: string; threshold: number; copy: Copy }) {
    const router = useRouter();
    const dialog = useRef<HTMLDialogElement>(null);
    const [mode, setMode] = useState<Mode | null>(null);
    const [quantity, setQuantity] = useState(0);
    const [note, setNote] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const [pending, setPending] = useState(false);
    const [minimum, setMinimum] = useState(String(threshold));
    const [generation, setGeneration] = useState(0);

    useEffect(() => {
        setMinimum(String(threshold));
    }, [threshold]);
    const field = "rounded-xl border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-stone-900 outline-none focus:border-emerald-800 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-50";

    function ask(next: Mode, form: HTMLFormElement) {
        const data = new FormData(form);
        const amount = Number(data.get("quantity"));
        const reason = String(data.get("note") ?? "").trim();
        if (!Number.isInteger(amount) || amount < (next === "correct" ? 0 : 1)) {
            setError(copy.invNeedQty);
            return;
        }
        if (next !== "receive" && reason.length === 0) {
            setError(copy.invNeedNote);
            return;
        }
        setError(null);
        setMode(next);
        setQuantity(amount);
        setNote(reason);
        dialog.current?.showModal();
    }

    async function apply() {
        if (!mode) return;
        setPending(true);
        const result = mode === "receive"
            ? await receiveStock(productId, quantity, note)
            : mode === "damage"
                ? await writeOffStock(productId, quantity, note)
                : await correctStock(productId, quantity, note);
        setPending(false);
        if (!result.success) {
            setError(failureText(result.error, copy));
            return;
        }
        dialog.current?.close();
        setMode(null);
        setError(null);
        setNotice(copy.invSaved);
        setGeneration((value) => value + 1);
        router.refresh();
    }

    const prompt = mode === "damage" ? copy.invConfirmDamage : mode === "correct" ? copy.invConfirmCorrect : copy.invConfirmReceive;

    return (
        <div className="mt-4 flex flex-col gap-4">
            {notice && <p className="text-sm text-emerald-800 dark:text-emerald-200">{notice}</p>}
            {error && !mode && <p className="text-sm text-red-700 dark:text-red-300">{error}</p>}
            <section className="rounded-2xl border border-[#E5E7EB] bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
                <h2 className="text-sm font-medium text-emerald-950 dark:text-emerald-50">{copy.invThreshold}</h2>
                <p className="mt-1 text-sm text-stone-500">{copy.invThresholdHint}</p>
                <form
                    className="mt-3 flex flex-wrap items-center gap-2"
                    onSubmit={async (event) => {
                        event.preventDefault();
                        const value = Number(new FormData(event.currentTarget).get("threshold"));
                        if (!Number.isInteger(value) || value < 0) {
                            setError(copy.invNeedQty);
                            return;
                        }
                        setPending(true);
                        setError(null);
                        const result = await setLowStockThreshold(productId, value);
                        setPending(false);
                        if (!result.success) {
                            setError(failureText(result.error, copy));
                            return;
                        }
                        setNotice(copy.invThresholdSaved);
                        router.refresh();
                    }}
                >
                    <input name="threshold" type="number" min={0} max={1000} value={minimum} onChange={(event) => setMinimum(event.target.value)} className={`${field} w-28`} />
                    <button disabled={pending} className="rounded-full bg-emerald-900 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-950 disabled:opacity-60">{copy.invSaveThreshold}</button>
                </form>
            </section>

            <section>
                <h2 className="text-sm font-medium text-emerald-950 dark:text-emerald-50">{copy.invOperations}</h2>
                <div key={generation} className="mt-2 grid gap-3 lg:grid-cols-3">
                    <form className="rounded-2xl border border-[#E5E7EB] bg-white p-3 dark:border-stone-800 dark:bg-stone-900" onSubmit={(event) => { event.preventDefault(); ask("receive", event.currentTarget); }}>
                        <h3 className="text-sm font-medium text-stone-900 dark:text-stone-50">{copy.invReceive}</h3>
                        <label className="mt-2 flex flex-col gap-1 text-xs text-stone-500">{copy.invQuantity}<input name="quantity" type="number" min={1} required className={field} /></label>
                        <label className="mt-2 flex flex-col gap-1 text-xs text-stone-500">{copy.invNote}<input name="note" maxLength={300} className={field} /></label>
                        <button className="mt-3 rounded-full bg-emerald-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-950">{copy.invReceive}</button>
                    </form>
                    <form className="rounded-2xl border border-[#E5E7EB] bg-white p-3 dark:border-stone-800 dark:bg-stone-900" onSubmit={(event) => { event.preventDefault(); ask("damage", event.currentTarget); }}>
                        <h3 className="text-sm font-medium text-stone-900 dark:text-stone-50">{copy.invDamage}</h3>
                        <label className="mt-2 flex flex-col gap-1 text-xs text-stone-500">{copy.invQuantity}<input name="quantity" type="number" min={1} required className={field} /></label>
                        <label className="mt-2 flex flex-col gap-1 text-xs text-stone-500">{copy.invNote}<input name="note" maxLength={300} required className={field} /></label>
                        <button className="mt-3 rounded-full border border-amber-700 px-3 py-1.5 text-sm font-medium text-amber-950 hover:bg-amber-50 dark:text-amber-100 dark:hover:bg-amber-950">{copy.invDamage}</button>
                    </form>
                    <form className="rounded-2xl border border-[#E5E7EB] bg-white p-3 dark:border-stone-800 dark:bg-stone-900" onSubmit={(event) => { event.preventDefault(); ask("correct", event.currentTarget); }}>
                        <h3 className="text-sm font-medium text-stone-900 dark:text-stone-50">{copy.invCorrect}</h3>
                        <p className="mt-1 text-xs leading-5 text-stone-500">{copy.invCountedHint}</p>
                        <label className="mt-2 flex flex-col gap-1 text-xs text-stone-500">{copy.invCounted}<input name="quantity" type="number" min={0} required className={field} /></label>
                        <label className="mt-2 flex flex-col gap-1 text-xs text-stone-500">{copy.invNote}<input name="note" maxLength={300} required className={field} /></label>
                        <button className="mt-3 rounded-full border border-emerald-800 px-3 py-1.5 text-sm font-medium text-emerald-900 hover:bg-emerald-50 dark:border-emerald-300 dark:text-emerald-100 dark:hover:bg-emerald-950">{copy.invCorrect}</button>
                    </form>
                </div>
            </section>

            <dialog ref={dialog} className="m-auto max-h-[calc(100dvh-2rem)] w-[min(28rem,calc(100%-2rem))] overflow-y-auto rounded-2xl border border-[#E5E7EB] bg-white p-5 text-stone-900 shadow-lg backdrop:bg-stone-950/40 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-50" onClose={() => { setMode(null); setError(null); }}>
                <h3 className="text-base font-semibold text-emerald-950 dark:text-emerald-50">{prompt}</h3>
                {error && mode && <p className="mt-2 text-sm text-red-700 dark:text-red-300">{error}</p>}
                <div className="mt-4 flex flex-wrap justify-end gap-2">
                    <button type="button" onClick={() => dialog.current?.close()} disabled={pending} className="rounded-full px-3 py-2 text-sm text-stone-600 hover:bg-stone-100 disabled:opacity-60 dark:text-stone-300 dark:hover:bg-stone-800">{copy.invCancel}</button>
                    <button type="button" onClick={apply} disabled={pending} className="rounded-full bg-emerald-900 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-950 disabled:opacity-60">{copy.invApply}</button>
                </div>
            </dialog>
        </div>
    );
}
