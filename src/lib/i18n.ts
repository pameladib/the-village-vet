import { cookies } from "next/headers";

export type Locale = "en" | "ar";

const copy = {
    en: {
        clinicName: "The Village Vet",
        home: "Home",
        clinic: "Clinic",
        shop: "Shop",
        dashboard: "Dashboard",
        language: "العربية",
        welcome: "Welcome back",
        myPets: "My pets",
        noPets: "No added pets",
        addPet: "+ Add new pet",
        upcomingVisits: "Upcoming appointments",
        book: "+ Book an appointment",
        noVisits: "No upcoming appointments",
        care: "Upcoming vaccines and treatments",
        noCare: "Nothing is due.",
        overdue: "Overdue",
        due: "Due",
        notices: "Notices",
        noNotices: "No notices yet.",
        markRead: "Mark read",
        shopLink: "Pet shop",
        clinicLink: "Clinic details",
        installLink: "Install the app",
        today: "Today",
        search: "Search",
        searchHint: "Owner name, pet name, or phone",
        noMatches: "No matches.",
        orders: "Shop orders",
        stock: "Low stock",
        blocks: "Schedule blocks",
        settings: "Clinic details",
        invites: "Owner setup link",
        bookForClient: "Book for a client",
    },
    ar: {
        clinicName: "البيطري في القرية",
        home: "الرئيسية",
        clinic: "العيادة",
        shop: "المتجر",
        dashboard: "لوحتي",
        language: "English",
        welcome: "أهلاً بعودتك",
        myPets: "حيواناتي",
        noPets: "لا توجد حيوانات مضافة",
        addPet: "+ أضف حيواناً",
        upcomingVisits: "المواعيد القادمة",
        book: "+ احجز موعداً",
        noVisits: "لا توجد مواعيد قادمة",
        care: "اللقاحات والعلاجات القادمة",
        noCare: "لا يوجد شيء مستحق.",
        overdue: "متأخر",
        due: "مستحق",
        notices: "التنبيهات",
        noNotices: "لا توجد تنبيهات.",
        markRead: "تمت القراءة",
        shopLink: "متجر الحيوانات",
        clinicLink: "معلومات العيادة",
        installLink: "تثبيت التطبيق",
        today: "اليوم",
        search: "بحث",
        searchHint: "اسم المالك أو الحيوان أو الهاتف",
        noMatches: "لا توجد نتائج.",
        orders: "طلبات المتجر",
        stock: "مخزون منخفض",
        blocks: "فترات الإغلاق",
        settings: "معلومات العيادة",
        invites: "رابط إنشاء حساب",
        bookForClient: "احجز لعميل",
    },
} as const;

export type Copy = { [Key in keyof (typeof copy)["en"]]: string };

export async function getLocale(): Promise<Locale> {
    const jar = await cookies();
    return jar.get("locale")?.value === "ar" ? "ar" : "en";
}

export function messages(locale: Locale): Copy {
    return copy[locale];
}
