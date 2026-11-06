import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { username } from "better-auth/plugins"
import { prisma } from "@/lib/prisma"; // your prisma client instance
import { notify } from "@/lib/notifications";

export const auth = betterAuth({
    database: prismaAdapter(prisma, {
        provider: "postgresql",
    }),
    emailAndPassword: {
        enabled: true,
    },
    plugins: [ 
        username({ displayUsername: false }) // we use a name field alongside the username field so no need for this option
    ], 
    user: {
        additionalFields: {
            phoneNumber: {
                type: "string",
                required: true,
                unique: true,
            },
            role: {
                type: ["OWNER", "ADMIN", "SECONDARY_ADMIN"],
                defaultValue: "OWNER",
                input: false
            }
        },
    },
    // Memory limits apply on each server instance. Production still uses this until a shared store is added.
    rateLimit: {
        enabled: true,
        window: 60,
        max: 30,
        customRules: {
            "/sign-up/email": { window: 600, max: 5 },
            "/sign-in/username": { window: 60, max: 10 },
        },
    },
    databaseHooks: {
        user: {
            create: {
                after: async (user) => {
                    try {
                        const staff = await prisma.user.findMany({
                            where: { role: { in: ["ADMIN", "SECONDARY_ADMIN"] }, NOT: { id: user.id } },
                            select: { id: true },
                        });
                        for (const person of staff) {
                            await notify(person.id, "New client account", `${user.name} created an account.`, `signup:${user.id}:${person.id}`);
                        }
                    } catch {
                        // A failed notice must not undo the new account.
                    }
                },
            },
        },
    },
});