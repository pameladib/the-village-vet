import QRCode from "qrcode";

export default async function AppQr({ url, size, label }: { url: string; size: number; label: string }) {
    const svg = await QRCode.toString(url, { type: "svg", margin: 1, width: size });
    return (
        <div
            className="w-fit max-w-full rounded-2xl bg-white p-3 [&_svg]:h-auto [&_svg]:max-w-full"
            role="img"
            aria-label={label}
            dangerouslySetInnerHTML={{ __html: svg }}
        />
    );
}
