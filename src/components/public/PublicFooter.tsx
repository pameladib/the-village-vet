import Link from "next/link";
import type { ClinicSetting } from "../../../generated/prisma/client";
import type { Copy } from "@/lib/i18n";
import { phoneHref, whatsappHref } from "@/lib/clinic/public";

const facebookUrl = "https://www.facebook.com/thevillagevet.lb/";
const instagramUrl = "https://www.instagram.com/thevillagevet.lb/";

export default function PublicFooter({
    copy,
    settings,
}: {
    copy: Copy;
    settings: ClinicSetting | null;
}) {
    const email = settings?.email?.trim();
    const phone = settings?.phone?.trim();
    const whatsapp = settings?.whatsapp?.trim();
    const call = phone ? phoneHref(phone) : null;
    const chat = whatsapp ? whatsappHref(whatsapp) : null;
    const year = new Date().getFullYear();
    const columns = email || phone || whatsapp ? "lg:grid-cols-4" : "lg:grid-cols-3";

    return (
        <footer className="border-t border-stone-200 bg-stone-50">
            <div className={`mx-auto grid w-full max-w-6xl justify-items-center gap-8 px-5 py-10 text-center sm:grid-cols-2 ${columns}`}>
                <div className="max-w-xs">
                    <p className="text-base font-semibold text-emerald-950">{copy.clinicName}</p>
                    <p className="mt-3 text-sm leading-6 text-stone-600">{copy.footerBlurb}</p>
                </div>
                <nav aria-label={copy.footerNav}>
                    <p className="text-sm font-semibold text-emerald-950">{copy.footerNav}</p>
                    <ul className="mt-3 space-y-2 text-sm text-stone-600">
                        <li><Link href="/about" className="hover:text-emerald-950">{copy.navAbout}</Link></li>
                        <li><Link href="/shop" className="hover:text-emerald-950">{copy.navStore}</Link></li>
                        <li><Link href="/find-us" className="hover:text-emerald-950">{copy.navFindUs}</Link></li>
                    </ul>
                </nav>
                {(email || phone || whatsapp) && (
                    <div className="max-w-xs">
                        <p className="text-sm font-semibold text-emerald-950">{copy.navContact}</p>
                        <ul className="mt-3 space-y-2 text-sm break-words text-stone-600">
                            {email && (
                                <li>
                                    <a href={`mailto:${email}`} className="hover:text-emerald-950">
                                        {copy.footerEmail}: {email}
                                    </a>
                                </li>
                            )}
                            {phone && (
                                <li>
                                    {call ? <a href={call} className="hover:text-emerald-950">{copy.footerPhone}: {phone}</a> : <span>{copy.footerPhone}: {phone}</span>}
                                </li>
                            )}
                            {whatsapp && (
                                <li>
                                    {chat ? <a href={chat} className="hover:text-emerald-950">{copy.whatsapp}: {whatsapp}</a> : <span>{copy.whatsapp}: {whatsapp}</span>}
                                </li>
                            )}
                        </ul>
                    </div>
                )}
                <div>
                    <p className="text-sm font-semibold text-emerald-950">{copy.footerFollow}</p>
                    <ul className="mt-3 flex items-center justify-center gap-4">
                        <li>
                            <a href={facebookUrl} aria-label="Facebook" target="_blank" rel="noopener noreferrer" className="text-stone-600 hover:text-emerald-950">
                                <FacebookIcon />
                            </a>
                        </li>
                        <li>
                            <a href={instagramUrl} aria-label="Instagram" target="_blank" rel="noopener noreferrer" className="text-stone-600 hover:text-emerald-950">
                                <InstagramIcon />
                            </a>
                        </li>
                    </ul>
                </div>
            </div>
            <p className="border-t border-stone-200 py-4 text-center text-xs text-stone-500">
                © {year} {copy.clinicName}. {copy.rights}
            </p>
        </footer>
    );
}

// lucide-react no longer ships brand marks, so these follow its old stroke icons.
function FacebookIcon() {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
        </svg>
    );
}

function InstagramIcon() {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
            <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
            <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
        </svg>
    );
}
