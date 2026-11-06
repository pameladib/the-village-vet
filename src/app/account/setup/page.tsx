import { createHash } from "crypto";
import SetupAccountForm from "@/components/auth/SetupAccountForm";
import { prisma } from "@/lib/prisma";

export default async function SetupPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
    const { token = "" } = await searchParams;
    const identifier = `owner-invite:${createHash("sha256").update(token).digest("hex")}`;
    const invite = token
        ? await prisma.verification.findFirst({
            where: { identifier, expiresAt: { gt: new Date() } },
        })
        : null;

    if (!invite) {
        return (
            <main className="mx-auto w-full max-w-lg flex-1 px-4 py-8">
                <h1 className="text-2xl font-semibold">This link is not valid</h1>
                <p className="mt-2 text-sm text-stone-600">Ask the clinic for a new setup link.</p>
            </main>
        );
    }

    const stored = JSON.parse(invite.value) as { name: string; phoneNumber: string };

    return (
        <main className="mx-auto w-full max-w-lg flex-1 px-4 py-8">
            <h1 className="text-2xl font-semibold">Create your account</h1>
            <SetupAccountForm token={token} name={stored.name} phoneNumber={stored.phoneNumber} />
        </main>
    );
}
