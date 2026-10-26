import { auth } from "@/lib/auth/auth";
import { headers } from "next/headers";

export default async function TestPage() {

    await auth.api.signInEmail({
        body: { 
            email: "john@doe.com", 
            password: "password" 
        }, 
        headers: await headers() // optional but would be useful to get the user IP, user agent, etc.})
    })

}