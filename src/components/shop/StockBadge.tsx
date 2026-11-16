import type { StockState } from "@/lib/shop/inventory";

const tones: Record<StockState, string> = {
    in: "bg-emerald-100 text-emerald-950",
    low: "bg-amber-100 text-amber-950",
    out: "bg-stone-200 text-stone-700",
};

export default function StockBadge({ state, label }: { state: StockState; label: string }) {
    return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${tones[state]}`}>{label}</span>;
}
