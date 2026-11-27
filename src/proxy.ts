import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth/auth";
import { ownerMustChangePassword } from "@/lib/auth/password-change";

function hasSessionCookie(request: NextRequest) {
    return request.cookies.has("better-auth.session_token") || request.cookies.has("__Secure-better-auth.session_token");
}

export async function proxy(request: NextRequest) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-pathname", request.nextUrl.pathname);
    const { pathname } = request.nextUrl;

    if (pathname === "/sw.js" || pathname === "/offline.html" || pathname === "/manifest.webmanifest") {
        return NextResponse.next({ request: { headers: requestHeaders } });
    }

    if (!pathname.startsWith("/api/auth") && hasSessionCookie(request)) {
        const session = await auth.api.getSession({ headers: request.headers });
        if (session?.user.deactivatedAt && pathname !== "/login") {
            const status = request.method === "GET" || request.method === "HEAD" ? 307 : 303;
            return NextResponse.redirect(new URL("/login", request.url), status);
        }
        if (pathname !== "/account/password" && pathname !== "/login" && session?.user.role === "OWNER" && await ownerMustChangePassword(session.user.id)) {
            const status = request.method === "GET" || request.method === "HEAD" ? 307 : 303;
            return NextResponse.redirect(new URL("/account/password", request.url), status);
        }
    }

    return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico)$).*)"],
};
