"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { markNotificationRead } from "@/lib/actions/notifications";

export default function NotificationList({
    items,
    empty,
    markRead,
}: {
    items: { id: string; title: string; body: string; readAt: Date | null }[];
    empty: string;
    markRead: string;
}) {
    const router = useRouter();
    const [pending, setPending] = useState<string | null>(null);
    if (items.length === 0) return <p className="mt-3 text-sm text-stone-600 dark:text-stone-300">{empty}</p>;

    return (
        <ul className="mt-3 flex flex-col gap-2">
            {items.map((item) => (
                <li key={item.id} className={`rounded-xl border px-3 py-2 text-sm ${item.readAt ? "border-stone-200 text-stone-500" : "border-amber-300 bg-white text-stone-900 dark:bg-stone-900 dark:text-stone-50"}`}>
                    <p className="font-medium">{item.title}</p>
                    <p className="mt-0.5">{item.body}</p>
                    {!item.readAt && (
                        <button
                            type="button"
                            disabled={pending === item.id}
                            onClick={async () => {
                                setPending(item.id);
                                await markNotificationRead(item.id);
                                router.refresh();
                            }}
                            className="mt-2 text-xs font-medium text-emerald-800 dark:text-emerald-200"
                        >
                            {markRead}
                        </button>
                    )}
                </li>
            ))}
        </ul>
    );
}
