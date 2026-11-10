// Kept out of i18n.ts so client components can use it. That file reads cookies.
export function intlLocale(locale: "en" | "ar") {
    return locale === "ar" ? "ar-u-nu-arab" : "en-GB";
}
