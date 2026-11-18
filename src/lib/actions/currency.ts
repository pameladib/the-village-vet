"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { isCurrency } from "@/lib/shop/money";

export async function setCurrency(currency: string) {
    if (!isCurrency(currency)) return;
    const jar = await cookies();
    jar.set("currency", currency, {
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
        sameSite: "lax",
    });
    revalidatePath("/", "layout");
}
