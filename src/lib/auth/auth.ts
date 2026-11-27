import { APIError, betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { username } from "better-auth/plugins" // for username-based authentication functionality
import { prisma } from "@/lib/prisma"; // our prisma client instance
import { notify } from "@/lib/notifications"; // for sending notifications to users

export const auth = betterAuth({
    database: prismaAdapter(prisma, { // prisma adapter connects Better Auth to Prisma so it can store and retrieve authentication data 
        provider: "postgresql",
    }),
    emailAndPassword: {
        enabled: true, // we enable this when we need password-based authentication. Other types like google login, magic key, OTPs ... do not require it
    },
    // Owners open the app for a visit or a booking, often weeks or months apart.
    // A year of inactivity still keeps them signed in. Each visit extends it again.
    session: { // to change the expiresIn and updateAge values, we pass the session object to the auth configuration
        expiresIn: 60 * 60 * 24 * 365, // configuring session expiration to be 1 year (Better Auth's default is 7 days, but we want to keep owners signed in for longer periods of time)
    },
    plugins: [ // enabling username plugin for username-based authentication functionality
        username({ displayUsername: false }) // the username plugin normally supports two fields: username and displayUserName, which is the original user-facing version (Better Auth normalizes the username to lowercase and removes special characters so displayUsername allows us to display the original username entered by the user). However, since we are using a name field alongside the username, We no longer need the displayUsername option so we disable it.
    ], 
    user: { 
        additionalFields: { // to add additional fields to the models created by Better Auth, we pass the additionalFields object to the corresponding model configuration
            phoneNumber: {
                type: "string",
                required: true, // making the phone number field required
                unique: false, // more than one account can share a phone number
            },
            role: {
                type: ["OWNER", "ADMIN", "SECONDARY_ADMIN"],
                defaultValue: "OWNER",
                input: false
            },
            deactivatedAt: {
                type: "date",
                required: false,
                input: false,
            },
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
        session: {
            create: {
                before: async (session) => {
                    const user = await prisma.user.findUnique({
                        where: { id: session.userId },
                        select: { deactivatedAt: true },
                    });
                    if (user?.deactivatedAt) {
                        throw APIError.from("FORBIDDEN", {
                            message: "This account is deactivated.",
                            code: "ACCOUNT_DEACTIVATED",
                        });
                    }
                },
            },
        },
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