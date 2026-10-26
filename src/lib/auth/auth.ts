import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { username } from "better-auth/plugins"
import { prisma } from "@/lib/prisma"; // your prisma client instance

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
});