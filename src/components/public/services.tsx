import { House, Scissors, Sparkles, Stethoscope, Syringe, Worm } from "lucide-react";
import type { Copy } from "@/lib/i18n";

export const serviceItems = [
    { title: "serviceCheckupTitle", body: "serviceCheckupBody", icon: Stethoscope },
    { title: "serviceVaccineTitle", body: "serviceVaccineBody", icon: Syringe },
    { title: "serviceParasiteTitle", body: "serviceParasiteBody", icon: Worm },
    { title: "serviceSurgeryTitle", body: "serviceSurgeryBody", icon: Scissors },
    { title: "serviceGroomingTitle", body: "serviceGroomingBody", icon: Sparkles },
    { title: "serviceBoardingTitle", body: "serviceBoardingBody", icon: House },
] as const;

export function ServiceGrid({ copy }: { copy: Copy }) {
    return (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {serviceItems.map((service) => {
                const Icon = service.icon;
                return (
                    <li key={service.title} className="rounded-xl border border-stone-200 bg-white p-5">
                        <span className="flex size-9 items-center justify-center rounded-full bg-emerald-50 text-emerald-900">
                            <Icon className="size-4" aria-hidden="true" />
                        </span>
                        <h3 className="mt-4 text-lg text-emerald-950">{copy[service.title]}</h3>
                        <p className="mt-2 text-sm leading-6 text-stone-600">{copy[service.body]}</p>
                    </li>
                );
            })}
        </ul>
    );
}
