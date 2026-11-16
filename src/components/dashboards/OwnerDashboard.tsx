"use client";

import { PawPrint } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import EnablePush from "@/components/EnablePush";
import InstallPrompt from "@/components/InstallPrompt";
import NotificationList from "@/components/NotificationList";
import AppointmentCard from "@/components/pets/cards/AppointmentCard";
import PetCard from "@/components/pets/cards/PetCard";
import { doseCopyKey } from "@/lib/clinic/vaccines";
import type { Copy, Locale } from "@/lib/i18n";
import { intlLocale } from "@/lib/intl-locale";
import type { AppointmentWithPet } from "@/lib/types/appointments";
import type { PetCardData } from "@/lib/types/pets";

type Reminder = {
    id: string;
    kind: "VACCINATION" | "DEWORMING" | "FLEA_TREATMENT";
    dose: string | null;
    dueAt: string;
    petId: string;
    petName: string;
    status: "overdue" | "due" | "upcoming";
};

type Notice = {
    id: string;
    title: string;
    body: string;
    dedupeKey: string | null;
    createdAt: string;
    readAt: string | null;
};

const statusTone = {
    overdue: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300",
    due: "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200",
    upcoming: "bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
};

export default function OwnerDashboard({
    pets,
    ownerName,
    appointments,
    copy,
    locale,
    reminders,
    notices,
}: {
    pets: PetCardData[];
    ownerName: string;
    appointments: AppointmentWithPet[];
    copy: Copy;
    locale: Locale;
    reminders: Reminder[];
    notices: Notice[];
}) {
    const router = useRouter();
    const dueOn = new Intl.DateTimeFormat(intlLocale(locale), { timeZone: "Asia/Beirut", day: "numeric", month: "short", year: "numeric" });
    const careStatus = {
        overdue: copy.overdue,
        due: copy.dueToday,
        upcoming: copy.careUpcoming,
    };

    return (
        <div className="flex flex-1 justify-center px-4 py-6 sm:px-6 sm:py-8">
            <div className="w-full max-w-6xl">
                <section className="relative overflow-hidden rounded-2xl bg-emerald-800 px-5 py-4 text-white dark:bg-emerald-700 sm:px-6">
                    <div className="relative z-10 max-w-xl">
                        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
                            {copy.welcome}, {ownerName}!
                        </h1>
                        <p className="mt-1.5 text-sm leading-6 text-emerald-50/90">{copy.welcomeLead}</p>
                    </div>
                    <PawPrint className="pointer-events-none absolute -bottom-5 -end-2 size-24 text-white/10" strokeWidth={1.25} />
                </section>

                <InstallPrompt copy={copy} />

                <section className="mt-5 rounded-2xl border border-[#E5E7EB] bg-white px-4 py-4 shadow-sm dark:border-stone-800 dark:bg-stone-900 sm:px-5">
                    <h2 className="text-base font-semibold text-emerald-950 dark:text-emerald-50">{copy.myPets}</h2>
                    {pets.length === 0 && <p className="mt-3 text-sm text-stone-500">{copy.noPets}</p>}
                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {pets.map((pet) => (
                            <PetCard key={pet.id} pet={pet} copy={copy} />
                        ))}
                        <button
                            type="button"
                            onClick={() => router.push("/pets/new")}
                            className="flex min-h-24 cursor-pointer items-center justify-center rounded-2xl border border-dashed border-emerald-300 bg-emerald-50/70 px-4 text-sm font-medium text-emerald-900 transition hover:border-emerald-700 hover:bg-emerald-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/40 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-100 dark:hover:border-emerald-400"
                        >
                            {copy.addPet}
                        </button>
                    </div>
                </section>

                <div className="mt-5 grid items-start gap-5 lg:grid-cols-2">
                <section className="rounded-2xl border border-[#E5E7EB] bg-white px-4 py-4 shadow-sm dark:border-stone-800 dark:bg-stone-900 sm:px-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <h2 className="text-base font-semibold text-emerald-950 dark:text-emerald-50">{copy.upcomingVisits}</h2>
                        <button
                            type="button"
                            onClick={() => router.push("/appointments/new")}
                            className="cursor-pointer rounded-full bg-emerald-900 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/40"
                        >
                            {copy.book}
                        </button>
                    </div>
                    {appointments.length === 0 ? (
                        <div className="mt-3">
                            <p className="text-sm font-medium text-stone-800 dark:text-stone-100">{copy.noVisits}</p>
                            <p className="mt-1 text-sm text-stone-500">{copy.noVisitsLead}</p>
                        </div>
                    ) : (
                        <div className="mt-3 flex flex-col gap-2">
                            {appointments.map((appointment) => (
                                <AppointmentCard key={appointment.id} appointment={appointment} copy={copy} locale={locale} />
                            ))}
                        </div>
                    )}
                </section>

                <section className="rounded-2xl border border-[#E5E7EB] bg-white px-4 py-4 shadow-sm dark:border-stone-800 dark:bg-stone-900 sm:px-5">
                    <h2 className="text-base font-semibold text-emerald-950 dark:text-emerald-50">{copy.care}</h2>
                    {reminders.length === 0 ? (
                        <div className="mt-3">
                            <p className="text-sm font-medium text-stone-800 dark:text-stone-100">{copy.noCare}</p>
                            <p className="mt-1 text-sm text-stone-500">{copy.careClear}</p>
                        </div>
                    ) : (
                        <ul className="mt-3 flex flex-col gap-2">
                            {reminders.map((reminder) => (
                                <li key={reminder.id} className="rounded-xl bg-stone-50 px-3 py-2.5 text-sm dark:bg-stone-950">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="truncate font-medium text-stone-900 dark:text-stone-50">{reminder.petName}</p>
                                            <p className="text-stone-600 dark:text-stone-300">{copy[doseCopyKey(reminder.dose) ?? (reminder.kind === "DEWORMING" ? "doseDeworming" : reminder.kind === "FLEA_TREATMENT" ? "doseFlea" : "doseAnnual")]}</p>
                                            <p className="text-stone-500">{dueOn.format(new Date(reminder.dueAt))}</p>
                                        </div>
                                        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${statusTone[reminder.status]}`}>
                                            {careStatus[reminder.status]}
                                        </span>
                                    </div>
                                    <Link
                                        href={`/appointments/new?petId=${reminder.petId}&service=${reminder.kind}`}
                                        className="mt-2.5 inline-flex rounded-full bg-emerald-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/40"
                                    >
                                        {copy.bookAppointment}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
                </div>

                <section className="mt-5 rounded-2xl border border-[#E5E7EB] bg-white px-4 py-4 shadow-sm dark:border-stone-800 dark:bg-stone-900 sm:px-5">
                    <h2 className="text-base font-semibold text-emerald-950 dark:text-emerald-50">{copy.notices}</h2>
                    <EnablePush copy={copy} />
                    <NotificationList
                        empty={copy.noNotices}
                        markRead={copy.markRead}
                        locale={locale}
                        copy={copy}
                        items={notices.map((notice) => ({ ...notice, readAt: notice.readAt ? new Date(notice.readAt) : null }))}
                    />
                </section>
            </div>
        </div>
    );
}
