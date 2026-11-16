import Image from "next/image";
import { PawPrint } from "lucide-react";

export default function ProductPhoto({ src, alt, sizes }: { src: string | null; alt: string; sizes: string }) {
    if (!src) {
        return (
            <div className="flex size-full items-center justify-center bg-[#efe8dc] text-emerald-900/40">
                <PawPrint className="size-10" strokeWidth={1.25} />
            </div>
        );
    }

    if (src.startsWith("/images/")) {
        return <Image src={src} alt={alt} fill sizes={sizes} className="object-cover" />;
    }

    return <img src={src} alt={alt} className="size-full object-cover" />;
}
