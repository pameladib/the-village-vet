import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: "The Village Vet",
        short_name: "Village Vet",
        description: "Appointments, pet records, and the clinic shop.",
        start_url: "/dashboard",
        scope: "/",
        display: "standalone",
        background_color: "#F8FAF9",
        theme_color: "#065f46",
        icons: [
            { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
            { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
            { src: "/icon-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
            { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
    };
}
