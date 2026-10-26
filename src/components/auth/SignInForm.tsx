"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth/auth-client";
import type { SuccessContext } from "@better-fetch/fetch";
import { useRouter } from "next/navigation";

const inputClassName =
    "w-full min-w-0 rounded-lg border bg-white px-3 py-2.5 text-sm text-stone-900 shadow-sm outline-none transition placeholder:text-stone-400 dark:bg-stone-950 dark:text-stone-50";

const validInputClassName =
    "border-stone-300 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15 dark:border-stone-700 dark:focus:border-emerald-400 dark:focus:ring-emerald-400/20";

const invalidInputClassName =
    "border-red-600 focus:border-red-600 focus:ring-2 focus:ring-red-600/15";

const fieldErrorClassName = "mt-1.5 text-sm text-red-700 dark:text-red-300";

type LogInFields = {
    username: string;
    password: string;
};

function logInFieldErrors(form: LogInFields) {
    const errors: Partial<LogInFields> = {};
    const username = form.username.trim();

    if (!username) errors.username = "Enter your username.";
    else if (username.length < 3) errors.username = "Use at least 3 characters.";
    else if (username.length > 30) errors.username = "Use 30 characters or fewer.";
    else if (!/^[a-zA-Z0-9_.]+$/.test(username)) errors.username = "Use only letters, numbers, dots, and underscores.";
    if (!form.password.trim()) errors.password = "Enter your password.";

    return errors;
}

function logInRequestMessage(error: { code?: string }) {
    if (error.code === "INVALID_USERNAME_OR_PASSWORD") return "That username and password don't match.";
    if (error.code === "USERNAME_TOO_SHORT") return "Use at least 3 characters.";
    if (error.code === "USERNAME_TOO_LONG") return "Use 30 characters or fewer.";
    if (error.code === "INVALID_USERNAME") return "Use only letters, numbers, dots, and underscores.";
    return "We couldn't log you in. Try again.";
}

export default function LogInForm() {
    const [form, setForm] = useState<LogInFields>({
        username: "",
        password: ""
    });
    const [fieldErrors, setFieldErrors] = useState<Partial<LogInFields>>({});
    const [formError, setFormError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const router = useRouter();
    async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
        e.preventDefault();

        const nextFieldErrors = logInFieldErrors(form);
        setFieldErrors(nextFieldErrors);
        setFormError(null);
        if (Object.keys(nextFieldErrors).length > 0) return;

        setSubmitting(true);

        try {
            const { error } = await authClient.signIn.username({
                username: form.username.trim(),
                password: form.password
            }, {
                onSuccess: (_ctx: SuccessContext) => {
                    router.push("/dashboard");
                }
            });

            if (error) {
                setFormError(logInRequestMessage(error));
                setSubmitting(false);
            }
        } catch {
            setFormError("We couldn't log you in. Try again.");
            setSubmitting(false);
        }
    }

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
        const { name, value } = e.target;

        setForm({
            ...form,
            [name]: value
        });
        setFieldErrors((current) => ({ ...current, [name]: undefined }));
        setFormError(null);
    }

    return (
        <div className="flex min-h-full w-full min-w-0 flex-1 flex-col overflow-x-hidden bg-stone-100 font-sans lg:grid lg:grid-cols-[minmax(0,46%)_minmax(0,1fr)] dark:bg-stone-950">
            <section className="relative flex min-w-0 flex-col justify-between bg-emerald-950 px-6 py-6 text-emerald-50 sm:px-10 lg:px-14 lg:py-16">
                <div className="pointer-events-none absolute inset-0 overflow-hidden">
                    <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-emerald-700/40 blur-3xl" />
                    <div className="absolute bottom-0 -left-16 h-56 w-56 rounded-full bg-emerald-400/10 blur-3xl" />
                </div>

                <p className="relative text-sm font-medium tracking-[0.22em] text-emerald-200 uppercase">
                    The Village Vet
                </p>

                <div className="relative mt-4 w-full min-w-0 lg:mt-0 lg:max-w-md">
                    <h1 className="max-w-full text-3xl leading-tight font-semibold tracking-tight text-white lg:text-5xl">
                        Welcome back
                    </h1>
                    <p className="mt-3 max-w-full text-sm leading-6 text-emerald-100/90 lg:mt-5 lg:text-lg lg:leading-7">
                        Log in to see your pets and keep their details with the clinic.
                    </p>
                </div>

                <ul className="relative hidden space-y-3 text-sm text-emerald-100/80 lg:block">
                    <li>Visits, weight, and vaccinations in one place</li>
                    <li>Your pet&apos;s record, ready when you arrive</li>
                </ul>
            </section>

            <section className="flex min-w-0 flex-1 items-center justify-center px-4 py-6 sm:px-8 sm:py-12 lg:flex-none">
                <form
                    onSubmit={handleSubmit}
                    className="w-full max-w-md min-w-0 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8 dark:border-stone-800 dark:bg-stone-900"
                >
                    <h2 className="text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-50">
                        Log in
                    </h2>
            

                    <div className="mt-8 space-y-4">
                        <div>
                            <label htmlFor="username" className="mb-1.5 block text-sm font-medium text-stone-800 dark:text-stone-200">
                                Username
                            </label>
                            <input id="username" type="text" name="username" value={form.username} onChange={handleChange} autoComplete="username" placeholder="pamela.smith" className={`${inputClassName} ${fieldErrors.username ? invalidInputClassName : validInputClassName}`} />
                            {fieldErrors.username && <p className={fieldErrorClassName}>{fieldErrors.username}</p>}
                        </div>
                        <div>
                            <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-stone-800 dark:text-stone-200">
                                Password
                            </label>
                            <input id="password" type="password" name="password" value={form.password} onChange={handleChange} autoComplete="current-password" placeholder="Password" className={`${inputClassName} ${fieldErrors.password ? invalidInputClassName : validInputClassName}`} />
                            {fieldErrors.password && <p className={fieldErrorClassName}>{fieldErrors.password}</p>}
                        </div>
                    </div>

                    {formError && (
                        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-200">
                            {formError}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={submitting}
                        className="mt-6 w-full cursor-pointer rounded-lg bg-emerald-800 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/40 active:scale-[0.98] active:bg-emerald-950 disabled:cursor-not-allowed disabled:bg-emerald-800/70 disabled:active:scale-100 dark:bg-emerald-700 dark:hover:bg-emerald-600 dark:active:bg-emerald-800 dark:disabled:bg-emerald-700/60"
                    >
                        {submitting ? "Logging in…" : "Log In"}
                    </button>
                    <p className="mt-5 text-center text-sm text-stone-500 dark:text-stone-400">
                        Don&apos;t have an account?{" "}
                        <a
                            href="/sign-up"
                            className="font-medium text-emerald-800 underline-offset-2 hover:underline dark:text-emerald-300"
                        >
                            Sign up
                        </a>
                    </p>
                </form>
            </section>

            <footer className="bg-emerald-950 px-6 py-8 text-emerald-50 lg:hidden">
                <p className="text-sm font-medium tracking-[0.22em] text-emerald-200 uppercase">
                    The Village Vet
                </p>
                <p className="mt-3 max-w-sm text-sm leading-6 text-emerald-100/85">
                    Neighborhood care for the cats and dogs you look after.
                </p>
            </footer>
        </div>
    );

}