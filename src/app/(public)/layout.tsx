import { Fraunces } from "next/font/google";
import { headers } from "next/headers";
import PublicFooter from "@/components/public/PublicFooter";
import PublicHeader from "@/components/public/PublicHeader";
import { auth } from "@/lib/auth/auth";
import { enforcePasswordChange } from "@/lib/auth/password-change";
import { getClinicSettings } from "@/lib/clinic/public";
import { getLocale, messages } from "@/lib/i18n";

const fraunces = Fraunces({
    subsets: ["latin"],
    variable: "--font-serif",
});

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
    const locale = await getLocale();
    const copy = messages(locale);
    const [session, settings] = await Promise.all([
        auth.api.getSession({ headers: await headers() }),
        getClinicSettings(),
    ]);
    await enforcePasswordChange(session?.user.role, session?.user.id);

    return (
        <div className={`flex flex-1 flex-col bg-white font-sans text-stone-800 ${locale === "en" ? `${fraunces.variable} public-serif` : ""}`}>
            <PublicHeader copy={copy} locale={locale} loggedIn={Boolean(session)} showProfile={session?.user.role === "OWNER"} />
            <div className="flex-1">{children}</div>
            <PublicFooter copy={copy} settings={settings} />
        </div>
    );
}
