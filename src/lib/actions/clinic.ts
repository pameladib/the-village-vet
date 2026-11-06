"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/session";

const settingsSchema = z.object({
    phone: z.string().trim().max(40).optional(),
    whatsapp: z.string().trim().max(40).optional(),
    address: z.string().trim().max(300).optional(),
    mapsUrl: z.string().trim().max(500).optional(),
    emergencyPhone: z.string().trim().max(40).optional(),
    about: z.string().trim().max(2000).optional(),
});

function emptyToNull(value: string | undefined) {
    return value ? value : null;
}

export async function saveClinicSettings(input: unknown) {
    try {
        await requireRole(["ADMIN"]);
    } catch {
        return { success: false as const, formErrors: ["Only the veterinarian can edit the clinic page."] };
    }

    const parsed = settingsSchema.safeParse(input);
    if (!parsed.success) return { success: false as const, formErrors: ["Check the clinic details."] };
    if (parsed.data.mapsUrl && !parsed.data.mapsUrl.startsWith("https://")) {
        return { success: false as const, formErrors: ["The map link must start with https://."] };
    }

    await prisma.clinicSetting.upsert({
        where: { id: "clinic" },
        update: {
            phone: emptyToNull(parsed.data.phone),
            whatsapp: emptyToNull(parsed.data.whatsapp),
            address: emptyToNull(parsed.data.address),
            mapsUrl: emptyToNull(parsed.data.mapsUrl),
            emergencyPhone: emptyToNull(parsed.data.emergencyPhone),
            about: emptyToNull(parsed.data.about),
        },
        create: {
            id: "clinic",
            phone: emptyToNull(parsed.data.phone),
            whatsapp: emptyToNull(parsed.data.whatsapp),
            address: emptyToNull(parsed.data.address),
            mapsUrl: emptyToNull(parsed.data.mapsUrl),
            emergencyPhone: emptyToNull(parsed.data.emergencyPhone),
            about: emptyToNull(parsed.data.about),
        },
    });

    revalidatePath("/clinic");
    return { success: true as const };
}
