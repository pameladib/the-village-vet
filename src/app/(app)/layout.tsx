import SiteHeader from "@/components/SiteHeader";
import { getLocale, messages } from "@/lib/i18n";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
    const locale = await getLocale();
    const copy = messages(locale);

    return (
        <>
            <SiteHeader copy={copy} locale={locale} />
            {children}
        </>
    );
}
