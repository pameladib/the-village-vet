import { Cake, Calendar, House, Mars, Palette, PawPrint, Scale, Tag, Venus } from "lucide-react";
import type { Copy, Locale } from "@/lib/i18n";
import { intlLocale } from "@/lib/intl-locale";
import type { PetProfileData } from "../PetProfile";

function amount(value: number, one: string, many: string) {
    const shown = Number.isInteger(value) ? String(value) : String(value);
    return `${shown} ${value === 1 ? one : many}`;
}

function formatCalendarDate(date: Date, locale: Locale) {
    return new Intl.DateTimeFormat(intlLocale(locale), {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
    }).format(date);
}

function ageFromDateOfBirth(date: Date, copy: Copy) {
    const birthYear = date.getUTCFullYear();
    const birthMonth = date.getUTCMonth();
    const birthDay = date.getUTCDate();
    const today = new Date();

    let years = today.getFullYear() - birthYear;
    const birthdayPassed =
        today.getMonth() > birthMonth ||
        (today.getMonth() === birthMonth && today.getDate() >= birthDay);
    if (!birthdayPassed) years -= 1;
    if (years >= 1) return amount(years, copy.ageYear, copy.ageYearsPlural);

    let months = (today.getFullYear() - birthYear) * 12 + (today.getMonth() - birthMonth);
    if (today.getDate() < birthDay) months -= 1;
    if (months >= 1) return amount(months, copy.ageMonth, copy.ageMonthsPlural);

    const birth = Date.UTC(birthYear, birthMonth, birthDay);
    const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
    const days = Math.max(0, Math.round((todayUtc - birth) / 86_400_000));
    return amount(days, copy.ageDay, copy.ageDaysPlural);
}

function formatAge(pet: PetProfileData, copy: Copy) {
    if (pet.dateOfBirth) return ageFromDateOfBirth(pet.dateOfBirth, copy);

    if (pet.estimatedAgeValue != null && pet.estimatedAgeUnit) {
        const units = {
            DAYS: [copy.ageDay, copy.ageDaysPlural],
            WEEKS: [copy.ageWeek, copy.ageWeeksPlural],
            MONTHS: [copy.ageMonth, copy.ageMonthsPlural],
            YEARS: [copy.ageYear, copy.ageYearsPlural],
        } as const;
        const [one, many] = units[pet.estimatedAgeUnit];
        return amount(pet.estimatedAgeValue, one, many);
    }

    return null;
}

function formatWeight(grams: number, copy: Copy) {
    if (grams >= 1000) {
        const kilograms = grams / 1000;
        const shown = Number.isInteger(kilograms) ? String(kilograms) : kilograms.toFixed(1);
        return `${shown} ${copy.unitKg}`;
    }

    return `${grams} ${copy.unitG}`;
}

export default function GeneralTab({ pet, copy, locale }: { pet: PetProfileData; copy: Copy; locale: Locale }) {
    const species = pet.species === "CAT" ? copy.speciesCat : copy.speciesDog;
    const lifestyle = pet.lifestyle === "INDOOR" ? copy.lifeIndoor : pet.lifestyle === "OUTDOOR" ? copy.lifeOutdoor : pet.lifestyle === "HYBRID" ? copy.lifeHybrid : null;
    const breed = pet.breed?.trim();

    const cards = [
        { label: copy.petSpecies, value: species, icon: <PawPrint className="size-4" strokeWidth={1.75} /> },
        { label: copy.petBreed, value: breed || null, icon: <Tag className="size-4" strokeWidth={1.75} /> },
        { label: copy.petColor, value: pet.color?.trim() || null, icon: <Palette className="size-4" strokeWidth={1.75} /> },
        { label: copy.petSex, value: pet.sex === "MALE" ? copy.sexMale : copy.sexFemale, icon: pet.sex === "MALE" ? <Mars className="size-4" strokeWidth={1.75} /> : <Venus className="size-4" strokeWidth={1.75} /> },
        { label: copy.petDob, value: pet.dateOfBirth ? formatCalendarDate(pet.dateOfBirth, locale) : null, icon: <Calendar className="size-4" strokeWidth={1.75} /> },
        { label: copy.age, value: formatAge(pet, copy), icon: <Cake className="size-4" strokeWidth={1.75} /> },
        { label: copy.petWeight, value: pet.currentWeightGrams == null ? null : formatWeight(pet.currentWeightGrams, copy), icon: <Scale className="size-4" strokeWidth={1.75} /> },
        { label: copy.petLifestyle, value: lifestyle, icon: <House className="size-4" strokeWidth={1.75} /> },
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
                        {card.value ?? copy.notProvided}
                    </p>
                </div>
            ))}
        </div>
    );
}


