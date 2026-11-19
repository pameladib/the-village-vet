"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Minus, Plus, Search } from "lucide-react";
import { createStaffOrder, searchOrderCustomers, searchOrderProducts } from "@/lib/actions/shop";
import { ownerChat } from "@/lib/clinic/phone";
import type { Copy, Locale } from "@/lib/i18n";
import { shopText } from "@/lib/shop/catalog";
import { formatMoney, inputFromMinor, minorFromInput, type Currency } from "@/lib/shop/money";
import { mapShopError } from "./ShopAdmin";

type Mode = "sale" | "later";
type Customer = { id: string; name: string; phoneNumber: string };
type ProductHit = { id: string; name: string; nameAr: string; price: number; stock: number; available: boolean };
type Line = ProductHit & { quantity: number };

const field = "h-10 w-full min-w-0 rounded-xl border border-stone-300 bg-white px-3 text-sm text-stone-900 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-50";
const option = (active: boolean) => active
    ? "flex min-w-0 items-start gap-3 rounded-2xl border border-emerald-800 bg-emerald-900 px-4 py-3 text-start text-white"
    : "flex min-w-0 items-start gap-3 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-start text-stone-900 hover:border-emerald-700 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-50";
const segment = (active: boolean) => active
    ? "h-10 rounded-full bg-emerald-900 px-4 text-sm font-medium text-white"
    : "h-10 rounded-full border border-stone-300 bg-white px-4 text-sm font-medium text-stone-800 hover:border-emerald-700 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100";

function Mark({ active }: { active: boolean }) {
    return (
        <span className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border ${active ? "border-white" : "border-stone-300 dark:border-stone-600"}`}>
            {active && <span className="size-2 rounded-full bg-white" />}
        </span>
    );
}

export default function StaffOrderForm({ copy, locale, currency }: { copy: Copy; locale: Locale; currency: Currency }) {
    const router = useRouter();
    const [mode, setMode] = useState<Mode>("sale");
    const [customerKind, setCustomerKind] = useState<"account" | "walkin">("account");
    const [payment, setPayment] = useState<"CASH" | "WHISH">("CASH");
    const [paid, setPaid] = useState(false);
    const [feeInput, setFeeInput] = useState(() => inputFromMinor(0, currency));
    const [fulfillment, setFulfillment] = useState<"PICKUP" | "DELIVERY">("PICKUP");
    const [address, setAddress] = useState("");
    const [deliveryPhone, setDeliveryPhone] = useState("");
    const [note, setNote] = useState("");
    const [customerQuery, setCustomerQuery] = useState("");
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [customerOpen, setCustomerOpen] = useState(false);
    const [customer, setCustomer] = useState<Customer | null>(null);
    const customerBox = useRef<HTMLDivElement>(null);
    const customerSearch = useRef(0);
    const customerQueryRef = useRef("");
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [productQuery, setProductQuery] = useState("");
    const [products, setProducts] = useState<ProductHit[]>([]);
    const [productOpen, setProductOpen] = useState(false);
    const productBox = useRef<HTMLDivElement>(null);
    const productSearch = useRef(0);
    const productQueryRef = useRef("");
    const [lines, setLines] = useState<Line[]>([]);
    const [pending, setPending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        function close(event: PointerEvent) {
            const target = event.target as Node;
            if (!customerBox.current?.contains(target)) setCustomerOpen(false);
            if (!productBox.current?.contains(target)) setProductOpen(false);
        }
        document.addEventListener("pointerdown", close);
        return () => document.removeEventListener("pointerdown", close);
    }, []);

    function lookUpCustomer(value: string) {
        setCustomerQuery(value);
        const q = value.trim();
        const previous = customerQueryRef.current;
        customerQueryRef.current = q;
        if (!q) {
            customerSearch.current += 1;
            setCustomers([]);
            setCustomerOpen(false);
            return;
        }
        setCustomerOpen(true);
        if (previous && (q.startsWith(previous) || previous.startsWith(q))) {
            const needle = q.toLowerCase();
            setCustomers((current) => current.filter((person) => person.name.toLowerCase().includes(needle) || person.phoneNumber.includes(q)));
        } else {
            setCustomers([]);
        }
        const request = ++customerSearch.current;
        void searchOrderCustomers(q).then((people) => {
            if (customerSearch.current !== request) return;
            setCustomers(people);
        });
    }

    function lookUpProduct(value: string) {
        setProductQuery(value);
        const q = value.trim();
        const previous = productQueryRef.current;
        productQueryRef.current = q;
        if (!q) {
            productSearch.current += 1;
            setProducts([]);
            setProductOpen(false);
            return;
        }
        setProductOpen(true);
        if (previous && (q.startsWith(previous) || previous.startsWith(q))) {
            const needle = q.toLowerCase();
            setProducts((current) => current.filter((product) => product.name.toLowerCase().includes(needle) || product.nameAr.toLowerCase().includes(needle)));
        } else {
            setProducts([]);
        }
        const request = ++productSearch.current;
        void searchOrderProducts(q).then((found) => {
            if (productSearch.current !== request) return;
            setProducts(found);
        });
    }

    function chooseCustomerKind(kind: "account" | "walkin") {
        setCustomerKind(kind);
        if (kind === "walkin") {
            setCustomer(null);
            setCustomerOpen(false);
        }
    }

    function setQuantity(id: string, quantity: number, stock: number) {
        const next = Math.min(stock, Math.max(1, quantity));
        setLines((current) => current.map((item) => item.id === id ? { ...item, quantity: next } : item));
    }

    const customerChat = customer ? ownerChat(customer.phoneNumber) : null;
    const subtotal = useMemo(() => lines.reduce((sum, line) => sum + line.price * line.quantity, 0), [lines]);
    const delivering = mode === "later" && fulfillment === "DELIVERY";
    const parsedFee = delivering ? minorFromInput(feeInput, currency) : 0;
    const deliveryFee = parsedFee ?? 0;

    function addProduct(product: ProductHit) {
        setLines((current) => {
            const existing = current.find((line) => line.id === product.id);
            if (!existing) return [...current, { ...product, quantity: 1 }];
            return current.map((line) => line.id === product.id ? { ...line, quantity: Math.min(line.stock, line.quantity + 1) } : line);
        });
        setProductQuery("");
        setProducts([]);
        setProductOpen(false);
        productQueryRef.current = "";
    }

    async function submit(event: FormEvent) {
        event.preventDefault();
        setError(null);
        const walkIn = customerKind === "walkin";
        if (mode === "later" && !walkIn && !customer) {
            setError(copy.shopErrCustomer);
            return;
        }
        if (mode === "later" && walkIn && (!name.trim() || phone.trim().length < 6)) {
            setError(copy.shopErrCustomer);
            return;
        }
        const fee = delivering ? minorFromInput(feeInput, currency) : 0;
        if (fee == null) {
            setError(copy.shopErrDeliveryFee);
            return;
        }
        setPending(true);
        const result = await createStaffOrder({
            mode,
            ownerId: walkIn ? undefined : customer?.id,
            customerName: walkIn ? name : undefined,
            customerPhone: walkIn ? phone : undefined,
            items: lines.map((line) => ({ productId: line.id, quantity: line.quantity })),
            fulfillment,
            payment,
            paid,
            deliveryFee: fee,
            deliveryAddress: address,
            deliveryPhone: deliveryPhone || (walkIn ? phone : customer?.phoneNumber) || "",
            deliveryNote: note,
        });
        setPending(false);
        if (!result.success) {
            setError(mapShopError(result.formErrors?.[0], copy));
            return;
        }
        router.push(`/admin/orders/${result.id}`);
    }

    const walkInLater = mode === "later" && customerKind === "walkin";
    const productMenu = productOpen && products.length > 0;

    return (
        <form className="mt-8 grid min-w-0 gap-8" onSubmit={(event) => void submit(event)}>
            <section className="grid gap-3">
                <h2 className="text-sm font-semibold text-emerald-950 dark:text-emerald-50">{copy.shopOrderType}</h2>
            <div className="grid gap-3 sm:grid-cols-2" role="group" aria-label={copy.shopOrderType}>
                <button type="button" aria-pressed={mode === "sale"} onClick={() => setMode("sale")} className={option(mode === "sale")}>
                    <Mark active={mode === "sale"} />
                    <span className="min-w-0">
                        <span className="block text-sm font-medium">{copy.shopCompleteSale}</span>
                        <span className={`mt-1 block text-xs leading-5 ${mode === "sale" ? "text-emerald-50" : "text-stone-500"}`}>{copy.shopCompleteSaleLead}</span>
                    </span>
                </button>
                <button type="button" aria-pressed={mode === "later"} onClick={() => setMode("later")} className={option(mode === "later")}>
                    <Mark active={mode === "later"} />
                    <span className="min-w-0">
                        <span className="block text-sm font-medium">{copy.shopFulfilLater}</span>
                        <span className={`mt-1 block text-xs leading-5 ${mode === "later" ? "text-emerald-50" : "text-stone-500"}`}>{copy.shopFulfilLaterLead}</span>
                    </span>
                </button>
            </div>
            </section>

            <section className="grid gap-3">
                <div>
                    <h2 className="text-sm font-semibold text-emerald-950 dark:text-emerald-50">{copy.shopColCustomer}</h2>
                    <p className="mt-1 text-sm text-stone-500">{copy.shopCustomerInfoLead}</p>
                </div>
                <div className="flex flex-wrap gap-2" role="group" aria-label={copy.shopColCustomer}>
                    <button type="button" aria-pressed={customerKind === "account"} onClick={() => chooseCustomerKind("account")} className={segment(customerKind === "account")}>{copy.shopExistingCustomer}</button>
                    <button type="button" aria-pressed={customerKind === "walkin"} onClick={() => chooseCustomerKind("walkin")} className={segment(customerKind === "walkin")}>{copy.shopWalkInCustomer}</button>
                </div>
                {customerKind === "account" ? (
                    customer ? (
                        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 dark:bg-stone-900">
                            <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-stone-900 dark:text-stone-50">
                                    <Link href={`/admin/owners/${customer.id}`} className="text-emerald-900 hover:underline dark:text-emerald-200">{customer.name}</Link>
                                </p>
                                <p className="text-sm text-stone-500">
                                    {customerChat ? (
                                        <a href={customerChat} target="_blank" rel="noopener noreferrer" className="text-emerald-900 hover:underline dark:text-emerald-200">{customer.phoneNumber}</a>
                                    ) : customer.phoneNumber}
                                </p>
                            </div>
                            <button type="button" onClick={() => { setCustomer(null); customerQueryRef.current = ""; }} className="text-sm text-stone-500 hover:text-emerald-900 dark:hover:text-emerald-200">{copy.shopChangeCustomer}</button>
                        </div>
                    ) : (
                        <div ref={customerBox} className="relative">
                            <label className="sr-only" htmlFor="order-customer-search">{copy.shopFindCustomer}</label>
                            <input
                                id="order-customer-search"
                                value={customerQuery}
                                autoComplete="off"
                                role="combobox"
                                aria-expanded={customerOpen && customers.length > 0}
                                aria-controls="order-customer-list"
                                placeholder={copy.shopFindCustomer}
                                onChange={(event) => lookUpCustomer(event.target.value)}
                                onFocus={() => { if (customerQuery.trim() && customers.length > 0) setCustomerOpen(true); }}
                                onKeyDown={(event) => { if (event.key === "Escape") setCustomerOpen(false); }}
                                className={`${field} ${customerOpen && customers.length > 0 ? "rounded-b-none focus:border-stone-300 focus:ring-0 dark:focus:border-stone-700" : ""}`}
                            />
                            {customerOpen && customers.length > 0 && (
                                <ul id="order-customer-list" role="listbox" className="absolute inset-x-0 top-full z-20 max-h-60 overflow-auto rounded-b-xl border border-t-0 border-stone-300 bg-white shadow-lg dark:border-stone-700 dark:bg-stone-900">
                                    {customers.map((person) => (
                                        <li key={person.id} className="border-t border-stone-100 first:border-t-0 dark:border-stone-800">
                                            <button
                                                type="button"
                                                role="option"
                                                aria-selected={false}
                                                onMouseDown={(event) => event.preventDefault()}
                                                onClick={() => { setCustomer(person); setCustomerQuery(""); setCustomers([]); setCustomerOpen(false); customerQueryRef.current = ""; }}
                                                className="flex w-full min-w-0 flex-col px-3 py-2 text-start hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                                            >
                                                <span className="truncate text-sm font-medium text-stone-900 dark:text-stone-50">{person.name}</span>
                                                <span className="truncate text-xs text-stone-500">{person.phoneNumber}</span>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    )
                ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                        <label className="text-sm text-stone-600 dark:text-stone-300">
                            {copy.shopColCustomer}
                            <input required={walkInLater} value={name} onChange={(event) => setName(event.target.value)} className={`${field} mt-1`} />
                        </label>
                        <label className="text-sm text-stone-600 dark:text-stone-300">
                            {copy.phone}
                            <input required={walkInLater} value={phone} onChange={(event) => setPhone(event.target.value)} className={`${field} mt-1`} />
                        </label>
                        {mode === "sale" && <p className="text-xs text-stone-500 sm:col-span-2">{copy.shopWalkInHint}</p>}
                    </div>
                )}
            </section>

            <section className="grid gap-3">
                <h2 className="text-sm font-semibold text-emerald-950 dark:text-emerald-50">{copy.shopColItems}</h2>
                <div ref={productBox} className="relative">
                    <label className="sr-only" htmlFor="order-product-search">{copy.shopFindProduct}</label>
                    <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-stone-400" strokeWidth={1.75} />
                    <input
                        id="order-product-search"
                        value={productQuery}
                        autoComplete="off"
                        role="combobox"
                        aria-expanded={productMenu}
                        aria-controls="order-product-list"
                        placeholder={copy.shopProductSearchPlaceholder}
                        onChange={(event) => lookUpProduct(event.target.value)}
                        onFocus={() => { if (productQuery.trim() && products.length > 0) setProductOpen(true); }}
                        onKeyDown={(event) => { if (event.key === "Escape") setProductOpen(false); }}
                        className={`${field} ps-9 ${productMenu ? "rounded-b-none focus:border-stone-300 focus:ring-0 dark:focus:border-stone-700" : ""}`}
                    />
                    {productMenu && (
                        <ul id="order-product-list" role="listbox" className="absolute inset-x-0 top-full z-20 max-h-60 overflow-auto rounded-b-xl border border-t-0 border-stone-300 bg-white shadow-lg dark:border-stone-700 dark:bg-stone-900">
                            {products.map((product) => (
                                <li key={product.id} className="border-t border-stone-100 first:border-t-0 dark:border-stone-800">
                                    <button
                                        type="button"
                                        role="option"
                                        aria-selected={false}
                                        onMouseDown={(event) => event.preventDefault()}
                                        onClick={() => addProduct(product)}
                                        className="flex w-full min-w-0 items-center justify-between gap-3 px-3 py-2 text-start hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                                    >
                                        <span className="min-w-0">
                                            <span className="block truncate text-sm font-medium text-stone-900 dark:text-stone-50">{shopText(locale, product.name, product.nameAr)}</span>
                                            {!product.available && <span className="text-xs text-stone-500">{copy.shopHidden}</span>}
                                        </span>
                                        <span className="shrink-0 text-sm text-stone-600 dark:text-stone-300">{formatMoney(product.price, currency, locale)}</span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
                {lines.length > 0 && (
                    <ul className="divide-y divide-stone-200 dark:divide-stone-800">
                        {lines.map((line) => (
                            <li key={line.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:gap-4">
                                <div className="min-w-0 sm:flex-1">
                                    <p className="truncate text-sm font-medium text-stone-900 dark:text-stone-50">{shopText(locale, line.name, line.nameAr)}</p>
                                    <p className="text-xs text-stone-500">{formatMoney(line.price, currency, locale)}{!line.available ? ` · ${copy.shopHidden}` : ""}</p>
                                </div>
                                <div className="flex items-center gap-3 sm:contents">
                                    <div className="inline-flex h-9 items-center rounded-full border border-stone-300 dark:border-stone-600">
                                        <button type="button" aria-label={copy.shopQty} disabled={line.quantity <= 1} onClick={() => setQuantity(line.id, line.quantity - 1, line.stock)} className="inline-flex size-9 items-center justify-center text-stone-600 disabled:opacity-40 dark:text-stone-300">
                                            <Minus className="size-3.5" strokeWidth={1.75} />
                                        </button>
                                        <span className="w-6 text-center text-sm tabular-nums">{line.quantity}</span>
                                        <button type="button" aria-label={copy.shopQty} disabled={line.quantity >= line.stock} onClick={() => setQuantity(line.id, line.quantity + 1, line.stock)} className="inline-flex size-9 items-center justify-center text-stone-600 disabled:opacity-40 dark:text-stone-300">
                                            <Plus className="size-3.5" strokeWidth={1.75} />
                                        </button>
                                    </div>
                                    <p className="ms-auto text-sm font-medium text-emerald-950 sm:ms-0 sm:w-28 sm:text-end dark:text-emerald-50">{formatMoney(line.price * line.quantity, currency, locale)}</p>
                                    <button type="button" onClick={() => setLines((current) => current.filter((item) => item.id !== line.id))} className="text-xs text-stone-400 hover:text-stone-700 dark:hover:text-stone-200">{copy.shopRemoveLine}</button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            {mode === "later" && (
                <section className="grid gap-3">
                    <h2 className="text-sm font-semibold text-emerald-950 dark:text-emerald-50">{copy.shopFulfilmentDetails}</h2>
                    <div className="flex flex-wrap gap-2" role="group" aria-label={copy.shopFulfilmentDetails}>
                        {(["PICKUP", "DELIVERY"] as const).map((kind) => (
                            <button key={kind} type="button" aria-pressed={fulfillment === kind} onClick={() => setFulfillment(kind)} className={segment(fulfillment === kind)}>
                                {kind === "DELIVERY" ? copy.shopDelivery : copy.shopClinicPickup}
                            </button>
                        ))}
                    </div>
                    {fulfillment === "DELIVERY" && (
                        <div className="grid gap-3 sm:grid-cols-2">
                            <label className="text-sm text-stone-600 sm:col-span-2 dark:text-stone-300">
                                {copy.shopDeliveryAddress}
                                <input required value={address} onChange={(event) => setAddress(event.target.value)} className={`${field} mt-1`} />
                            </label>
                            <label className="text-sm text-stone-600 dark:text-stone-300">
                                {copy.shopDeliveryPhone}
                                <input value={deliveryPhone} onChange={(event) => setDeliveryPhone(event.target.value)} placeholder={customerKind === "account" ? customer?.phoneNumber : phone} className={`${field} mt-1`} />
                            </label>
                            <label className="text-sm text-stone-600 dark:text-stone-300">
                                {copy.shopDeliveryNote}
                                <input value={note} onChange={(event) => setNote(event.target.value)} className={`${field} mt-1`} />
                            </label>
                            <label className="text-sm text-stone-600 dark:text-stone-300">
                                {copy.shopDeliveryFee}
                                <input inputMode="decimal" value={feeInput} onChange={(event) => setFeeInput(event.target.value)} className={`${field} mt-1`} />
                            </label>
                        </div>
                    )}
                </section>
            )}

            <section className="grid gap-3">
                <h2 className="text-sm font-semibold text-emerald-950 dark:text-emerald-50">{copy.shopPayment}</h2>
                <div className="flex flex-wrap gap-2" role="group" aria-label={copy.shopPayment}>
                    {(["CASH", "WHISH"] as const).map((method) => (
                        <button key={method} type="button" aria-pressed={payment === method} onClick={() => setPayment(method)} className={segment(payment === method)}>
                            {method === "WHISH" ? copy.shopPayWhish : copy.shopPayCash}
                        </button>
                    ))}
                </div>
                <label className="flex items-start gap-3 text-sm text-stone-800 dark:text-stone-100">
                    <input type="checkbox" checked={paid} onChange={(event) => setPaid(event.target.checked)} className="mt-1 size-4 accent-emerald-800" />
                    <span>
                        <span className="font-medium">{copy.shopPaymentReceived}</span>
                        <span className="mt-1 block text-stone-500">{copy.shopPaymentReceivedHint}</span>
                    </span>
                </label>
            </section>

            <section className="border-t border-stone-200 pt-4 dark:border-stone-800">
                <dl>
                    <div className="flex items-baseline justify-between gap-3 text-sm text-stone-600 dark:text-stone-300">
                        <dt>{copy.shopSubtotal}</dt>
                        <dd>{formatMoney(subtotal, currency, locale)}</dd>
                    </div>
                    {delivering && (
                        <div className="mt-2 flex items-baseline justify-between gap-3 text-sm text-stone-600 dark:text-stone-300">
                            <dt>{copy.shopDeliveryFee}</dt>
                            <dd>{formatMoney(deliveryFee, currency, locale)}</dd>
                        </div>
                    )}
                    <div className="mt-3 flex items-baseline justify-between gap-3 text-xl font-semibold text-emerald-950 dark:text-emerald-50">
                        <dt>{copy.shopTotal}</dt>
                        <dd>{formatMoney(subtotal + deliveryFee, currency, locale)}</dd>
                    </div>
                </dl>
            </section>

            {error && <p className="text-sm text-red-700 dark:text-red-300">{error}</p>}
            <button type="submit" disabled={pending || lines.length === 0} className="h-11 w-full rounded-full bg-emerald-900 px-5 text-sm font-medium text-white hover:bg-emerald-950 disabled:opacity-60 sm:w-fit">
                {copy.shopCreateOrder}
            </button>
        </form>
    );
}
