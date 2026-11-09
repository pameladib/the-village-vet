// this API route is triggered by Vercel Cron jobs at 05:00 and 06:00 UTC. Only the call that lands on 08:00 in Beirut sends reminders.

// we have two types of reminders: appointments (booked) and care reminders. Care reminders are used to remind the user to book a vaccination or treatment for their pet.

// beirutInstant() converts a date string and a time (hour and minute) to a JavaScript Date object in Beirut time
// hourInBeirut() returns the current hour in Beirut time
// todayInBeirut() returns the current date in Beirut time as a YYYY-MM-DD string

import { beirutInstant, careNoticeDay, hourInBeirut, todayInBeirut } from "@/lib/appointments/availability";
import { notify } from "@/lib/notifications"; // notify creates a new notification record in the database
import { prisma } from "@/lib/prisma"; // prisma is the database client, which allows us to query the database

function nextCalendarDate(date: string) { // takes a YYYY-MM-DD string and returns the next calendar date as a YYYY-MM-DD string (the next day)
    const [year, month, day] = date.split("-").map(Number); // date.split("-") splits a date string under the format YYYY-MM-DD into an array that looks lke [YYYY, MM, DD], then map(Number) converts each element of that array from a string to a number
    const next = new Date(Date.UTC(year, month - 1, day + 1)); // calculates the next calendar date by adding 1 day to the input date. JavaScript's Date automatically adjusts overflows in the month and year. Example: adding 1 day to 31/01/2026 results in 01/02/2026.
    return next.toISOString().slice(0, 10); // toISOString() writes that UTC instant as YYYY-MM-DDTHH:mm:ss.sssZ, and slice(0, 10) keeps the YYYY-MM-DD date. toISOString() is always UTC, so the server's timezone does not change the result.
}

// Vercel calls this at 05:00 and 06:00 UTC. Only the call that lands on 08:00 in Beirut sends reminders.
export async function GET(request: Request) {
    const secret = process.env.CRON_SECRET; // we need to verify that the request is coming from an authorized scheduler so we use a randomly generated secret stored as an environment variable in Vercel
    if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) { // the authorization header must be set to the secret value
        return new Response("Unauthorized", { status: 401 }); // otherwise, we return a 401 Unauthorized response
    }

    const now = new Date(); // creates a new Date object representing the current instant in the server's timezone
    if (hourInBeirut(now) !== 8) { // if the current hour in Beirut time is not 8, we return a 200 OK response with a skipped: true flag and no reminders
        return Response.json({ // when an API route receives a request, it must return a Response object to whoever made the request. By default, Response.json() returns a 200 OK response with a JSON body. We leave the status code at 200 OK because the endpoint successfully received and processed the request (no error occurred), but it did not perform any action because the current hour in Beirut time is not 8.
            skipped: true, // skipped is a boolean flag that indicates that the cron job was skipped because the current hour in Beirut time is not 8
            today: 0, // no today reminders were sent because the cron job was skipped
            tomorrow: 0, // no tomorrow reminders were sent because the cron job was skipped
            reminders: 0 // no care reminders were sent because the cron job was skipped
        });
    }

    const today = todayInBeirut(now); // calculating today's date in Beirut time
    const tomorrow = nextCalendarDate(today); // calculating tomorrow's date in Beirut time
    const dayAfter = nextCalendarDate(tomorrow); // calculating the day after tomorrow's date in Beirut time to use it as a boundary for the search query


    // A date string under the format YYYY-MM-DD is just a date, it doesn't specify the time. We need precise boundaries to query appointments. For this reason, we use beirutInstant() which given a Beirut calendar date and time, converts it into a JavaScript Date representing the corresponding instant. 
    const todayStart = beirutInstant(today, 0, 0); // today at midnight in Beirut time
    const tomorrowStart = beirutInstant(tomorrow, 0, 0); // tomorrow at midnight in Beirut time
    const dayAfterStart = beirutInstant(dayAfter, 0, 0); // the day after tomorrow at midnight in Beirut time

    const visits = await prisma.appointment.findMany({ // retrieving all booked appointments between today at midnight and the day after tomorrow at midnight in Beirut time
        where: { status: "BOOKED", startAt: { gte: todayStart, lt: dayAfterStart } }, // gte (greater than or equal to) and lt (less than) are Prisma query filters that translate into SQL >= and < operators. We didn't use BETWEEN because we don't want to include an appointment that starts exactly at the day after tomorrow at midnight.
        select: { id: true, ownerId: true, startAt: true }, // these are the only fields we need from the appointments. id is used to create a unique dedupeKey, ownerId identifies which user should receive the reminder, and startAt is used to determine if the appointment is today or tomorrow.
    });

    // this query translates into the following SQL query:
    /*
    SELECT id, ownerId, startAt
    FROM appointments
    WHERE status = 'BOOKED' AND startAt >= '2026-01-01 00:00:00' AND startAt < '2026-01-02 00:00:00'
    */


    // these variables are used to separate the appointments into today and tomorrow categories
    let todayCount = 0; // counts the number of appointments that are today
    let tomorrowCount = 0; // counts the number of appointments that are tomorrow

    for (const appointment of visits) { // iterating over the appointments that we retrieved from the database
        const sameDay = appointment.startAt < tomorrowStart; // boolean expression that checks if the appointment starts before tomorrow at midnight in Beirut time which would mean it is today
        if (sameDay) todayCount += 1; // if the appointment is today, we increment the todayCount variable
        else tomorrowCount += 1; // if the appointment is not today, we increment the tomorrowCount variable

        await notify( // notify creates a new notification record in the database. It takes the following arguments: the user ID, the notification type, the notification message, and the dedupeKey.
            appointment.ownerId,
            sameDay ? "Appointment today" : "Appointment tomorrow",
            sameDay ? "You have a visit today." : "You have a visit tomorrow.",
            sameDay ? `appt-today:${appointment.id}` : `appt-tomorrow:${appointment.id}`, // the dedupeKey is used to avoid sending duplicate notifications for the same appointment.
        );

        /* If the appointment is today:
        Title: Appointment today
        Body: You have a visit today.
        Dedupe key: appt-today:123

        If the appointment is tomorrow:
        Title: Appointment tomorrow
        Body: You have a visit tomorrow.
        Dedupe key: appt-tomorrow:123 */
    }

    // Open reminders whose due instant is already before tomorrow. careNoticeDay keeps only the due date and the date seven days later.
    const open = await prisma.careReminder.findMany({
        where: { completedAt: null, dueAt: { lt: tomorrowStart } },
        select: {
            id: true,
            kind: true,
            dueAt: true,
            petId: true,
            pet: { select: { name: true, ownerId: true } },
        },
    });
    const due = open.flatMap((reminder) => {
        const when = careNoticeDay(reminder.dueAt, now);
        return when ? [{ ...reminder, when }] : [];
    });

    // A booked visit that lists the same service suppresses today's notice. A missed day is not sent later.
    const booked = due.length === 0 ? [] : await prisma.appointment.findMany({
        where: { status: "BOOKED", petId: { in: [...new Set(due.map((reminder) => reminder.petId))] } },
        select: { petId: true, services: true },
    });
    const covered = new Set(booked.flatMap((appointment) =>
        appointment.services.map((service) => `${appointment.petId}:${service}`),
    ));

    let reminderCount = 0;
    for (const reminder of due) {
        if (covered.has(`${reminder.petId}:${reminder.kind}`)) continue;
        reminderCount += 1;
        const followUp = reminder.when === "plus7";
        await notify(
            reminder.pet.ownerId,
            followUp ? "Care is still due" : "Care is due today",
            `${reminder.pet.name} has a vaccination or treatment to book.`,
            `care:${reminder.id}:${followUp ? "plus7" : "due"}`,
        );
    }

    return Response.json({ skipped: false, today: todayCount, tomorrow: tomorrowCount, reminders: reminderCount }); // returning a 200 OK response with the number of today and tomorrow appointments and the number of care reminders
}
