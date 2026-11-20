import { createHash } from "crypto";
import SetupAccountForm from "@/components/auth/SetupAccountForm";
import LocaleSwitch from "@/components/LocaleSwitch";
import { getLocale, messages } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";

export default async function SetupPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
    const { token = "" } = await searchParams;
    const identifier = `owner-invite:${createHash("sha256").update(token).digest("hex")}`;
    const invite = token
        ? await prisma.verification.findFirst({
            where: { identifier, expiresAt: { gt: new Date() } },
        })
        : null;

    const locale = await getLocale();
    const copy = messages(locale);
    const language = (
        <div dir="ltr" className="mb-4 flex">
            <LocaleSwitch locale={locale} label={copy.language} className="rounded-full border border-stone-200 px-2.5 py-1 text-xs text-stone-600 hover:bg-stone-50" />
        </div>
    );

    if (!invite) {
        return (
            <main className="mx-auto w-full max-w-lg flex-1 px-4 py-8">
                {language}
                <h1 className="text-2xl font-semibold">{copy.setupInvalid}</h1>
                <p className="mt-2 text-sm text-stone-600">{copy.setupInvalidBody}</p>
            </main>
        );
    }

    const stored = JSON.parse(invite.value) as { name: string; phoneNumber: string };

    return (
        <main className="mx-auto w-full max-w-lg flex-1 px-4 py-8">
            {language}
            <h1 className="text-2xl font-semibold">{copy.setupTitle}</h1>
            <SetupAccountForm token={token} name={stored.name} phoneNumber={stored.phoneNumber} copy={copy} />
        </main>
    );
}
