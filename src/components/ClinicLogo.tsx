import type { Locale } from "@/lib/i18n";

export default function ClinicLogo({ locale, name, className }: { locale: Locale; name: string; className?: string }) {
    const mark = locale === "ar";
    return (
        <img
            src={mark ? "/images/logo-mark.png" : "/images/logo.png"}
            alt={name}
            width={mark ? 734 : 735}
            height={mark ? 290 : 428}
            className={className}
        />
    );
}
