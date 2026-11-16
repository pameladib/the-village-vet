"use client";

import { useRouter } from "next/navigation";

export default function OrderSort({
    label,
    oldest,
    newest,
    status,
    query,
    sort,
    owner = "",
}: {
    label: string;
    oldest: string;
    newest: string;
    status: string;
    query: string;
    sort: "old" | "new";
    owner?: string;
}) {
    const router = useRouter();

    return (
        <label className="flex shrink-0 items-center gap-2 text-sm text-stone-600 dark:text-stone-300">
            <span>{label}</span>
            <select
                value={sort}
                onChange={(event) => {
                    const params = new URLSearchParams();
                    if (status) params.set("status", status);
                    if (query) params.set("q", query);
                    if (owner) params.set("owner", owner);
                    if (event.target.value === "new") params.set("sort", "new");
                    const search = params.toString();
                    router.push(search ? `/admin/orders?${search}` : "/admin/orders");
                }}
                className="rounded-full border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-stone-900 outline-none focus:border-emerald-800 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-50"
            >
                <option value="old">{oldest}</option>
                <option value="new">{newest}</option>
            </select>
        </label>
    );
}
