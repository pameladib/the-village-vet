"use server";

import { cookies, headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth/auth";
import { rememberLocale } from "@/lib/locale-preference";

export async function setLocale(locale: "en" | "ar") {
    const jar = await cookies();
    jar.set("locale", locale, {
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
        sameSite: "lax",
    });
    const session = await auth.api.getSession({ headers: await headers() });
    await rememberLocale(session?.user.id, locale);
    revalidatePath("/", "layout");
}
