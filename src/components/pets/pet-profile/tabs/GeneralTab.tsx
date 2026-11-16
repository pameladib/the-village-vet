import { Cake, Calendar, House, Mars, Palette, PawPrint, Scale, Tag, Venus } from "lucide-react";
import type { PetProfileData } from "../PetProfile";

const speciesLabel = {
    CAT: "Cat",
    DOG: "Dog",
} as const;

const lifestyleLabel = {
    INDOOR: "Indoor",
    OUTDOOR: "Outdoor",
    HYBRID: "Hybrid",
} as const;

const ageUnitLabel = {
    DAYS: "day",
    WEEKS: "week",
    MONTHS: "month",
    YEARS: "year",
} as const;

function plural(value: number, unit: string) {
    const amount = Number.isInteger(value) ? String(value) : String(value);
    return `${amount} ${unit}${value === 1 ? "" : "s"}`;
}

function formatCalendarDate(date: Date) {
    return new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
    }).format(date);
}

function ageFromDateOfBirth(date: Date) {
    const birthYear = date.getUTCFullYear();
    const birthMonth = date.getUTCMonth();
    const birthDay = date.getUTCDate();
    const today = new Date();

    let years = today.getFullYear() - birthYear;
    const birthdayPassed =
        today.getMonth() > birthMonth ||
        (today.getMonth() === birthMonth && today.getDate() >= birthDay);
    if (!birthdayPassed) years -= 1;
    if (years >= 1) return plural(years, "year");

    let months = (today.getFullYear() - birthYear) * 12 + (today.getMonth() - birthMonth);
    if (today.getDate() < birthDay) months -= 1;
    if (months >= 1) return plural(months, "month");

    const birth = Date.UTC(birthYear, birthMonth, birthDay);
    const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
    const days = Math.max(0, Math.round((todayUtc - birth) / 86_400_000));
    return plural(days, "day");
}

function formatAge(pet: PetProfileData) {
    if (pet.dateOfBirth) return ageFromDateOfBirth(pet.dateOfBirth);

    if (pet.estimatedAgeValue != null && pet.estimatedAgeUnit) {
        return plural(pet.estimatedAgeValue, ageUnitLabel[pet.estimatedAgeUnit]);
    }

    return null;
}

function formatWeight(grams: number) {
    if (grams >= 1000) {
        const kilograms = grams / 1000;
        const amount = Number.isInteger(kilograms) ? String(kilograms) : kilograms.toFixed(1);
        return `${amount} kg`;
    }

    return `${grams} g`;
}

export default function GeneralTab({ pet }: { pet: PetProfileData }) {
    const species = speciesLabel[pet.species];
    const breed = pet.breed?.trim();

    const cards = [
        { label: "Species", value: species, icon: <PawPrint className="size-4" strokeWidth={1.75} /> },
        { label: "Breed", value: breed || null, icon: <Tag className="size-4" strokeWidth={1.75} /> },
        { label: "Color", value: pet.color?.trim() || null, icon: <Palette className="size-4" strokeWidth={1.75} /> },
        { label: "Sex", value: pet.sex === "MALE" ? "Male" : "Female", icon: pet.sex === "MALE" ? <Mars className="size-4" strokeWidth={1.75} /> : <Venus className="size-4" strokeWidth={1.75} /> },
        { label: "Date of birth", value: pet.dateOfBirth ? formatCalendarDate(pet.dateOfBirth) : null, icon: <Calendar className="size-4" strokeWidth={1.75} /> },
        { label: "Age", value: formatAge(pet), icon: <Cake className="size-4" strokeWidth={1.75} /> },
        { label: "Weight", value: pet.currentWeightGrams == null ? null : formatWeight(pet.currentWeightGrams), icon: <Scale className="size-4" strokeWidth={1.75} /> },
        { label: "Lifestyle", value: pet.lifestyle ? lifestyleLabel[pet.lifestyle] : null, icon: <House className="size-4" strokeWidth={1.75} /> },
    ];

    return (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {cards.map((card) => (
                <div key={card.label} className="rounded-2xl bg-stone-100 px-3.5 py-3.5 dark:bg-stone-900">
                    <div className="flex items-center gap-2">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-stone-200/80 text-emerald-800 dark:bg-stone-800 dark:text-emerald-200">
                            {card.icon}
                        </span>
                        <span className="text-sm font-medium leading-tight text-stone-600 dark:text-stone-300">{card.label}</span>
                    </div>
                    <p className={card.value ? "mt-4 text-lg font-semibold leading-snug text-stone-900 dark:text-stone-50" : "mt-4 text-lg font-semibold leading-snug text-stone-400 dark:text-stone-500"}>
                        {card.value ?? "Not provided"}
                    </p>
                </div>
            ))}
        </div>
    );
}


