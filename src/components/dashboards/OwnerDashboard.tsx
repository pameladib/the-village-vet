"use client";

import Link from "next/link";
import type { AppointmentWithPet } from "../../lib/types/appointments";
import type { PetCardData } from "../../lib/types/pets";
import type { Copy } from "@/lib/i18n";
import AppointmentCard from "../pets/cards/AppointmentCard";
import PetCard from "../pets/cards/PetCard";
import NotificationList from "../NotificationList";
import { useRouter } from "next/navigation";

type Reminder = { id: string; kind: string; dueAt: string; petName: string; overdue: boolean };
type Notice = { id: string; title: string; body: string; readAt: string | null };

export default function OwnerDashboard({ pets, ownerName, appointments, copy, reminders, notices }: { pets: PetCardData[], ownerName: string, appointments: AppointmentWithPet[], copy: Copy, reminders: Reminder[], notices: Notice[] }) {
    const router = useRouter();
    return (
        <div className="flex flex-1 justify-center bg-emerald-50 px-4 py-10 dark:bg-stone-950 sm:px-6">
            <div className="w-full max-w-3xl">
                <h1 className="rounded-2xl bg-emerald-800 px-5 py-4 text-2xl font-semibold tracking-tight text-white dark:bg-emerald-700">
                    {copy.welcome}, {ownerName}
                </h1>
                <nav className="mt-4 flex flex-wrap gap-3 text-sm font-medium text-emerald-800 dark:text-emerald-200">
                    <Link href="/shop">{copy.shopLink}</Link>
                    <Link href="/clinic">{copy.clinicLink}</Link>
                    <Link href="/install">{copy.installLink}</Link>
                </nav>

                <section className="mt-6 rounded-2xl border border-emerald-200 bg-white px-5 py-4 dark:border-emerald-900 dark:bg-stone-900">
                    <h2 className="text-sm font-medium text-emerald-900 dark:text-emerald-200">
                        {copy.myPets}
                    </h2>
                    {pets.length === 0 && (
                        <p className="mt-4 text-sm text-emerald-800 dark:text-emerald-200">
                            {copy.noPets}
                        </p>
                    )}
                    <div className="mt-4 flex flex-wrap items-start gap-4">
                        {pets.map((pet) => (
                            <PetCard key={pet.id} pet={pet} />
                        ))}
                        <button
                            type="button"
                            onClick={() => router.push("/pets/new")}
                            className="w-36 cursor-pointer rounded-2xl border border-dashed border-emerald-300 bg-emerald-50 px-3 py-2.5 text-center text-sm font-medium text-emerald-800 shadow-sm transition duration-200 hover:scale-[1.03] hover:border-emerald-700 hover:bg-emerald-100 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/40 active:scale-[0.98] dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200 dark:hover:border-emerald-400 dark:hover:bg-emerald-950"
                        >
                            {copy.addPet}
                        </button>
                    </div>
                </section>

                <section className="mt-6 rounded-2xl border border-sky-200 bg-sky-50 px-5 py-4 dark:border-sky-900 dark:bg-sky-950/40">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <h2 className="text-sm font-medium text-sky-950 dark:text-sky-100">
                            {copy.upcomingVisits}
                        </h2>
                        <button
                            type="button"
                            onClick={() => router.push("/appointments/new")}
                            className="cursor-pointer rounded-lg bg-emerald-800 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition duration-200 hover:scale-[1.03] hover:bg-emerald-700 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/40 active:scale-[0.98] dark:bg-emerald-700 dark:hover:bg-emerald-600"
                        >
                            {copy.book}
                        </button>
                    </div>
                    {appointments.length === 0 && (
                        <p className="mt-4 text-sm text-sky-800 dark:text-sky-200">
                            {copy.noVisits}
                        </p>
                    )}
                    <div className="mt-4 flex flex-col gap-3 empty:hidden">
                        {appointments.map((appointment) => (
                            <AppointmentCard key={appointment.id} appointment={appointment} />
                        ))}
                    </div>
                </section>

                <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 dark:border-amber-900 dark:bg-amber-950/40">
                    <h2 className="text-sm font-medium text-amber-950 dark:text-amber-100">
                        {copy.care}
                    </h2>
                    {reminders.length === 0 && <p className="mt-3 text-sm text-amber-900 dark:text-amber-100">{copy.noCare}</p>}
                    <ul className="mt-3 flex flex-col gap-2 text-sm text-amber-950 dark:text-amber-50">
                        {reminders.map((reminder) => (
                            <li key={reminder.id}>
                                {reminder.petName} · {reminder.kind} · {reminder.overdue ? copy.overdue : copy.due}{" "}
                                {new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Beirut", day: "numeric", month: "short", year: "numeric" }).format(new Date(reminder.dueAt))}
                            </li>
                        ))}
                    </ul>
                </section>

                <section className="mt-6 rounded-2xl border border-stone-200 bg-white px-5 py-4 dark:border-stone-700 dark:bg-stone-900">
                    <h2 className="text-sm font-medium text-stone-900 dark:text-stone-50">{copy.notices}</h2>
                    <NotificationList
                        empty={copy.noNotices}
                        markRead={copy.markRead}
                        items={notices.map((notice) => ({ ...notice, readAt: notice.readAt ? new Date(notice.readAt) : null }))}
                    />
                </section>
            </div>
        </div>
    );
}