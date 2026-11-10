import SignUpForm from "@/components/auth/SignUpForm";
import { getLocale, messages } from "@/lib/i18n";

export default async function SignUpPage() {
    const locale = await getLocale();
    return <SignUpForm copy={messages(locale)} locale={locale} />;
}