"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function VisitAddedNotice({ message, armed }: { message: string; armed: boolean }) {
    const router = useRouter();

    useEffect(() => {
        if (!armed) return;
        toast.success(message, { id: "visit-added" });
        router.replace("/dashboard");
    }, [armed, message, router]);

    return null;
}
