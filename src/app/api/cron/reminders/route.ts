import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notifications";

// Vercel calls this every hour. It does nothing useful until CRON_SECRET is set on the project.
export async function GET(request: Request) {
    const secret = process.env.CRON_SECRET;
    if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
        return new Response("Unauthorized", { status: 401 });
    }

    const now = new Date();
    const twoHours = new Date(now.getTime() + 2 * 60 * 60_000);
    const soon = await prisma.appointment.findMany({
        where: { status: "BOOKED", startAt: { gt: now, lte: twoHours } },
        select: { id: true, ownerId: true, startAt: true },
    });
    for (const appointment of soon) {
        await notify(
            appointment.ownerId,
            "Appointment soon",
            "You have a visit within the next two hours.",
            `appt-soon:${appointment.id}`,
        );
    }

    const dayAhead = new Date(now.getTime() + 24 * 60 * 60_000);
    const due = await prisma.careReminder.findMany({
        where: { completedAt: null, dueAt: { lte: dayAhead } },
        select: { id: true, dueAt: true, pet: { select: { name: true, ownerId: true } } },
    });
    for (const reminder of due) {
        const overdue = reminder.dueAt <= now;
        await notify(
            reminder.pet.ownerId,
            overdue ? "Care is overdue" : "Care is due tomorrow",
            `${reminder.pet.name} has a vaccination or treatment to book.`,
            `care:${reminder.id}:${overdue ? "overdue" : "soon"}`,
        );
    }

    return Response.json({ appointments: soon.length, reminders: due.length });
}
