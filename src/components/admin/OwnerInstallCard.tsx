import CopyAddressButton from "@/components/admin/CopyAddressButton";
import AppQr from "@/components/public/AppQr";
import type { Copy } from "@/lib/i18n";

export default function OwnerInstallCard({ url, copy }: { url: string | null; copy: Copy }) {
    return (
        <section className="mt-4 rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900 sm:p-6">
            <h2 className="text-base font-semibold text-emerald-950 dark:text-emerald-50">{copy.inviteInstallTitle}</h2>
            {url ? (
                <>
                    <p className="mt-1 text-sm leading-6 text-stone-600 dark:text-stone-300">{copy.inviteInstallScan}</p>
                    <div className="mt-4">
                        <AppQr url={`${url.replace(/\/$/, "")}/q`} size={240} label={copy.inviteInstallScan} />
                    </div>
                    <p dir="ltr" className="mt-3 break-all text-left text-sm text-stone-600 dark:text-stone-300">{url}</p>
                    <div className="mt-3">
                        <CopyAddressButton url={url} copy={copy} />
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div>
                            <h3 className="text-sm font-medium text-emerald-950 dark:text-emerald-50">{copy.inviteInstallIphone}</h3>
                            <p className="mt-1 text-sm leading-6 text-stone-600 dark:text-stone-300">{copy.inviteInstallIphoneSteps}</p>
                        </div>
                        <div>
                            <h3 className="text-sm font-medium text-emerald-950 dark:text-emerald-50">{copy.inviteInstallAndroid}</h3>
                            <p className="mt-1 text-sm leading-6 text-stone-600 dark:text-stone-300">{copy.inviteInstallAndroidSteps}</p>
                        </div>
                    </div>
                </>
            ) : (
                <p className="mt-2 text-sm text-red-700 dark:text-red-300">{copy.inviteAppUrlMissing}</p>
            )}
        </section>
    );
}
