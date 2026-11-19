import Link from "next/link";
import HistoryBack from "@/components/HistoryBack";
import { ChevronLeft } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import OwnerAccountForm from "@/components/admin/OwnerAccountForm";
import Page from "@/components/Page";
import OwnerPasswordReset from "@/components/admin/OwnerPasswordReset";
import SpeciesMark from "@/components/pets/SpeciesMark";
import { requireRole } from "@/lib/auth/session";
import { canSeeClinicalRecords } from "@/lib/auth/permissions";
import { getLocale, messages } from "@/lib/i18n";
import { intlLocale } from "@/lib/intl-locale";
import { prisma } from "@/lib/prisma";
import { orderFulfillmentLabel, orderPaymentLabel, orderStatusLabel, orderStatusTone, shortOrderId } from "@/lib/shop/catalog";
import { formatStored, orderCharge } from "@/lib/shop/money";
import { petPhotoSrc } from "@/lib/storage/files";

export default async function OwnerProfilePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    let session;
    try {
        session = await requireRole(["ADMIN", "SECONDARY_ADMIN"]);
    } catch {
        redirect("/dashboard");
    }

    const owner = await prisma.user.findFirst({
        where: { id, role: "OWNER" },
        select: {
            id: true,
            name: true,
            phoneNumber: true,
            username: true,
            createdAt: true,
            pets: {
                select: { id: true, name: true, species: true, breed: true, photoUrl: true },
                orderBy: { name: "asc" },
            },
            sessions: {
                select: { createdAt: true },
                orderBy: { createdAt: "desc" },
                take: 1,
            },
        },
    });
    if (!owner) notFound();

    const [recentOrders, orderCount] = await Promise.all([
        prisma.shopOrder.findMany({
            where: { ownerId: owner.id },
            orderBy: { createdAt: "desc" },
            take: 5,
            select: {
                id: true,
                status: true,
                payment: true,
                fulfillment: true,
                currency: true,
                deliveryFee: true,
                createdAt: true,
                items: { select: { quantity: true, unitPrice: true } },
            },
        }),
        prisma.shopOrder.count({ where: { ownerId: owner.id } }),
    ]);

    const locale = await getLocale();
    const copy = messages(locale);
    const clinical = canSeeClinicalRecords(session.user.role);
    const since = new Intl.DateTimeFormat(intlLocale(locale), { dateStyle: "medium", timeZone: "Asia/Beirut" });
    const signedIn = new Intl.DateTimeFormat(intlLocale(locale), { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Beirut" });
    const lastLogin = owner.sessions[0]?.createdAt;
    const speciesName = { CAT: copy.speciesCat, DOG: copy.speciesDog };

    return (
        <Page width="medium">
            <HistoryBack fallback="/admin/patients" className="inline-flex cursor-pointer items-center gap-1 text-sm font-medium text-emerald-900 hover:underline dark:text-emerald-200">
                <ChevronLeft className="size-4 rtl:rotate-180" />
                {copy.profileBack}
            </HistoryBack>
            <h1 className="mt-4 text-2xl font-semibold tracking-tight text-emerald-950 dark:text-emerald-50">{owner.name}</h1>
            <p className="mt-1 text-sm text-stone-500">{copy.ownerSince} {since.format(owner.createdAt)}</p>

            <div className="mt-5 grid gap-3 lg:grid-cols-2">
            <section className="h-full rounded-2xl border border-[#E5E7EB] bg-white px-4 py-4 shadow-sm dark:border-stone-800 dark:bg-stone-900">
                <h2 className="text-sm font-semibold text-emerald-950 dark:text-emerald-50">{copy.ownerPersonal}</h2>
                <OwnerAccountForm
                    copy={copy}
                    userId={owner.id}
                    name={owner.name}
                    phoneNumber={owner.phoneNumber}
                    username={owner.username}
                    canEdit
                />
            </section>

            <section className="flex h-full flex-col rounded-2xl border border-[#E5E7EB] bg-white px-4 py-4 shadow-sm dark:border-stone-800 dark:bg-stone-900">
                <h2 className="text-sm font-semibold text-emerald-950 dark:text-emerald-50">{copy.ownerAccount}</h2>
                <p className="mt-3 text-sm text-stone-500">{copy.username}</p>
                <p dir="ltr" className="text-left text-sm font-medium text-stone-900 dark:text-stone-50">{owner.username}</p>
                <p className="mt-3 text-sm text-stone-500">{copy.ownerLastLogin}</p>
                <p className="text-sm font-medium text-stone-900 dark:text-stone-50">{lastLogin ? signedIn.format(lastLogin) : copy.ownerNoLogin}</p>
                {session.user.role === "ADMIN" && <div className="mt-auto"><OwnerPasswordReset copy={copy} userId={owner.id} /></div>}
            </section>
            </div>

            <section className="mt-3 rounded-2xl border border-[#E5E7EB] bg-white px-4 py-4 shadow-sm dark:border-stone-800 dark:bg-stone-900">
                <h2 className="text-sm font-semibold text-emerald-950 dark:text-emerald-50">{copy.ownerPets}</h2>
                {owner.pets.length === 0 ? (
                    <p className="mt-3 text-sm text-stone-500">{copy.ownerNoPets}</p>
                ) : (
                    <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {owner.pets.map((pet) => {
                            const breed = pet.breed?.trim();
                            const photo = petPhotoSrc(pet.id, pet.photoUrl);
                            return (
                                <li key={pet.id}>
                                    <Link href={clinical ? `/pets/${pet.id}` : `/admin/patients/${pet.id}`} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-emerald-50 dark:hover:bg-emerald-950/40">
                                        <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                                            {photo ? <img src={photo} alt="" className="size-full object-cover" /> : <SpeciesMark species={pet.species} className="size-4" />}
                                        </span>
                                        <span className="min-w-0">
                                            <span className="block truncate text-sm font-semibold text-emerald-950 dark:text-emerald-50">{pet.name}</span>
                                            <span className="block truncate text-sm text-stone-500">
                                                {speciesName[pet.species]}
                                                {breed ? ` · ${breed}` : ""}
                                            </span>
                                        </span>
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </section>

            <section className="mt-3 rounded-2xl border border-[#E5E7EB] bg-white px-4 py-4 shadow-sm dark:border-stone-800 dark:bg-stone-900">
                <div className="flex items-center justify-between gap-3">
                    <h2 className="text-sm font-semibold text-emerald-950 dark:text-emerald-50">{copy.ownerOrders}</h2>
                    {orderCount > 0 && (
                        <Link href={`/admin/orders?owner=${owner.id}&status=all&sort=new`} className="text-sm font-medium text-emerald-900 hover:underline dark:text-emerald-200">
                            {copy.ownerViewOrders}
                        </Link>
                    )}
                </div>
                {recentOrders.length === 0 ? (
                    <p className="mt-3 text-sm text-stone-500">{copy.ownerNoOrders}</p>
                ) : (
                    <ul className="mt-3 flex flex-col gap-1">
                        {recentOrders.map((order) => {
                            const total = orderCharge(order.items, order.deliveryFee).total;
                            return (
                                <li key={order.id}>
                                    <Link href={`/admin/orders/${order.id}`} className="block rounded-xl px-2 py-2 hover:bg-emerald-50 dark:hover:bg-emerald-950/40">
                                        <span className="flex items-center justify-between gap-3">
                                            <span className="text-sm font-semibold text-emerald-950 dark:text-emerald-50">{shortOrderId(order.id)}</span>
                                            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${orderStatusTone(order.status)}`}>{orderStatusLabel(order.status, copy)}</span>
                                        </span>
                                        <span className="mt-1 block text-sm text-stone-500">
                                            {since.format(order.createdAt)}
                                            {" · "}
                                            {formatStored(total, order.currency, locale)}
                                        </span>
                                        <span className="block text-sm text-stone-500">
                                            {orderFulfillmentLabel(order.fulfillment, copy)}
                                            {" · "}
                                            {orderPaymentLabel(order.payment, copy)}
                                        </span>
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </section>

        </Page>
    );
}
