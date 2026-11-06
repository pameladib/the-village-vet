import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: "The Village Vet",
        short_name: "Village Vet",
        description: "Appointments, pet records, and the clinic shop.",
        start_url: "/",
        display: "standalone",
        background_color: "#ecfdf5",
        theme_color: "#065f46",
        icons: [
            { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
            { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
        ],
    };
}
