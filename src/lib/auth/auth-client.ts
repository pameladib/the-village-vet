import { inferAdditionalFields } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { usernameClient } from "better-auth/client/plugins"
import type { auth } from "@/lib/auth/auth"

export const authClient = createAuthClient({
    plugins: [
        inferAdditionalFields<typeof auth>(),
        usernameClient() 
    ],
});