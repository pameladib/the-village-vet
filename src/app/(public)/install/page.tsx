import QRCode from "qrcode";
import Link from "next/link";

const installUrl = "https://the-village-vet.vercel.app";

export default async function InstallPage() {
    const svg = await QRCode.toString(installUrl, { type: "svg", margin: 1, width: 240 });

    return (
        <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 py-8">
            <h1 className="text-2xl font-semibold">Install The Village Vet</h1>
            <p className="mt-2 text-sm text-stone-700">
                On a phone, open the site and use the browser&apos;s Add to Home Screen or Install action. Scanning this code opens the site. It does not create an account.
            </p>
            <div className="mt-6 w-fit rounded-2xl bg-white p-3" dangerouslySetInnerHTML={{ __html: svg }} />
            <p className="mt-3 text-sm">{installUrl}</p>
            <p className="mt-4 text-xs text-stone-500">Browser push notifications are not set up. Reminders appear in the app and from the hourly clinic job.</p>
            <Link href="/dashboard" className="mt-6 text-sm text-emerald-800">Dashboard</Link>
        </main>
    );
}
