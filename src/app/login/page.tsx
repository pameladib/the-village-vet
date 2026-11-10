import LogInForm from "@/components/auth/SignInForm";
import { returnPath } from "@/lib/clinic/public";
import { getLocale, messages } from "@/lib/i18n";

export default async function LogInPage({
    searchParams,
}: {
    searchParams: Promise<{ next?: string }>;
}) {
    const { next } = await searchParams;
    const locale = await getLocale();
    return <LogInForm nextPath={returnPath(next)} copy={messages(locale)} locale={locale} />;
}
