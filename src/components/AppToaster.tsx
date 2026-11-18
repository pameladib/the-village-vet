"use client";

import { Toaster } from "sonner";
import "sonner/dist/styles.css";

export default function AppToaster() {
    return (
        <Toaster
            position="bottom-right"
            offset={24}
            duration={5000}
            closeButton
            richColors
            toastOptions={{
                style: { fontSize: "1rem", padding: "16px 18px" },
            }}
        />
    );
}
