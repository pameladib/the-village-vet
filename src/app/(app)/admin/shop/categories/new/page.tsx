import Link from "next/link";
import { redirect } from "next/navigation";
import CategoryForm from "@/components/shop/CategoryForm";
import { requireRole } from "@/lib/auth/session";
import { getLocale, messages } from "@/lib/i18n";

export default async function NewCategoryPage() {
    try {
        await requireRole(["ADMIN", "SECONDARY_ADMIN"]);
    } catch {
        redirect("/dashboard");
    }

    const locale = await getLocale();
    const copy = messages(locale);

    return (
        <main className="mx-auto w-full max-w-xl flex-1 px-4 py-8">
            <Link href="/admin/shop/categories" className="text-sm text-emerald-800">{copy.shopBackCategories}</Link>
            <h1 className="mt-3 text-2xl font-semibold">{copy.shopAddCategory}</h1>
            <CategoryForm copy={copy} />
        </main>
    );
}
