import Link from "next/link";
import CartView from "@/components/shop/CartView";

export default function CartPage() {
    return (
        <main className="mx-auto w-full max-w-lg flex-1 px-4 py-8">
            <Link href="/shop" className="text-sm text-emerald-800">Shop</Link>
            <h1 className="mt-3 text-2xl font-semibold">Cart</h1>
            <CartView />
        </main>
    );
}
