import { NextResponse } from "next/server";
import { notifyStaff } from "@/lib/notifications";

const YEAR = 60 * 60 * 24 * 365;

// The install-page QR points here. The same browser only notifies once.
export async function GET(request: Request) {
    const seen = request.headers.get("cookie")?.split(";").some((part) => part.trim().startsWith("vv-qr="));
    const response = NextResponse.redirect(new URL("/", request.url));
    if (seen) return response;

    try {
        await notifyStaff(
            "QR code scanned",
            "Someone scanned the clinic QR code and opened the website.",
            `qr:${crypto.randomUUID()}`,
        );
        response.cookies.set("vv-qr", "1", {
            httpOnly: true,
            sameSite: "lax",
            path: "/",
            maxAge: YEAR,
            secure: process.env.NODE_ENV === "production",
        });
    } catch {
        // The website still opens when the notice cannot be saved.
    }
    return response;
}
