import Image from "next/image";

export default function ClinicPicture({
    src,
    alt,
    sizes,
    priority = false,
}: {
    src: string;
    alt: string;
    sizes: string;
    priority?: boolean;
}) {
    if (src.startsWith("/images/")) {
        return <Image src={src} alt={alt} fill priority={priority} sizes={sizes} className="object-cover" />;
    }

    return <img src={src} alt={alt} className="absolute inset-0 size-full object-cover" />;
}
