"use client";
import { useState } from "react";
import { authClient } from "@/lib/auth/auth-client";
import type { SuccessContext } from "@better-fetch/fetch";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ClinicLogo from "@/components/ClinicLogo";
import PasswordInput from "@/components/auth/PasswordInput";
import LocaleSwitch from "@/components/LocaleSwitch";
import type { Copy, Locale } from "@/lib/i18n";

const inputClassName =
    "w-full min-w-0 rounded-lg border bg-white px-3 py-2.5 text-sm text-stone-900 shadow-sm outline-none transition placeholder:text-stone-400 dark:bg-stone-950 dark:text-stone-50";

const validInputClassName =
    "border-stone-300 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/15 dark:border-stone-700 dark:focus:border-emerald-400 dark:focus:ring-emerald-400/20";

const invalidInputClassName =
    "border-red-600 focus:border-red-600 focus:ring-2 focus:ring-red-600/15";

const fieldErrorClassName = "mt-1.5 text-sm text-red-700 dark:text-red-300";

type SignUpFields = {
    name: string;
    username: string;
    phoneNumber: string;
    password: string;
};

function usernameError(username: string, copy: Copy) {
    const value = username.trim();
    if (!value) return copy.errUsernameRequired;
    if (value.length < 3) return copy.errUsernameShort;
    if (value.length > 30) return copy.errUsernameLong;
    if (!/^[a-zA-Z0-9_.]+$/.test(value)) return copy.errUsernameChars;
}

function signUpFieldErrors(form: SignUpFields, copy: Copy) {
    const errors: Partial<SignUpFields> = {};

    if (!form.name.trim()) errors.name = copy.errNameRequired;
    const username = usernameError(form.username, copy);
    if (username) errors.username = username;
    if (!form.phoneNumber.trim()) errors.phoneNumber = copy.errPhoneRequired;
    if (!form.password.trim()) errors.password = copy.errPasswordCreate;
    else if (form.password.length < 8) errors.password = copy.errPasswordShort;

    return errors;
}

function signUpRequestMessage(error: { code?: string; message?: string }, copy: Copy) {
    if (error.code === "USERNAME_IS_ALREADY_TAKEN" || error.code === "USER_ALREADY_EXISTS" || error.code === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL") {
        return copy.errUsernameTaken;
    }
    if (error.code === "USERNAME_TOO_SHORT") return copy.errUsernameShort;
    if (error.code === "USERNAME_TOO_LONG") return copy.errUsernameLong;
    if (error.code === "INVALID_USERNAME") return copy.errUsernameChars;
    if (error.code === "PASSWORD_TOO_SHORT") return copy.errPasswordShort;
    if (error.code === "PASSWORD_TOO_LONG") return copy.errPasswordLong;
    if (error.message && error.code) return `${error.message} (${error.code})`;
    if (error.message) return error.message;
    return copy.errSignUpFailed;
}

export default function SignUpForm({ copy, locale }: { copy: Copy; locale: Locale }) {
    const [form, setForm] = useState<SignUpFields>({
        name: "",
        username: "",
        phoneNumber: "",
        password: ""
    });
    const [fieldErrors, setFieldErrors] = useState<Partial<SignUpFields>>({});
    const [formError, setFormError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const router = useRouter();

    async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
        e.preventDefault();

        const nextFieldErrors = signUpFieldErrors(form, copy);
        setFieldErrors(nextFieldErrors);
        setFormError(null);
        if (Object.keys(nextFieldErrors).length > 0) return;

        setSubmitting(true);

        try {
            const username = form.username.trim().toLowerCase();
            const { error } = await authClient.signUp.email({
                name: form.name,
                username,
                phoneNumber: form.phoneNumber,
                password: form.password,
                email: `${username}@clients.thevillagevet.local`,
            }, {
                onSuccess: (_ctx: SuccessContext) => {
                    router.push("/pets/new");
                }
            });

            if (error) {
                setFormError(signUpRequestMessage(error, copy));
                setSubmitting(false);
            }
        } catch {
            setFormError(copy.errSignUpRequest);
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

                <div className="relative flex items-center justify-between gap-3">
                    <p className="text-sm font-medium tracking-[0.22em] text-emerald-200 uppercase">
                        {copy.clinicName}
                    </p>
                    <LocaleSwitch locale={locale} label={copy.language} className="rounded-full border border-emerald-700 px-2.5 py-1 text-xs text-emerald-50 hover:bg-emerald-900" />
                </div>

                <div className="relative mt-4 w-full min-w-0 lg:mt-0 lg:max-w-md">
                    <h1 className="max-w-full text-3xl leading-tight font-semibold tracking-tight text-white lg:text-5xl">
                        {copy.signUpWelcome}
                        <br />
                        {copy.clinicName}
                    </h1>
                    <p className="mt-3 max-w-full text-sm leading-6 text-emerald-100/90 lg:mt-5 lg:text-lg lg:leading-7">
                        {copy.signUpLead}
                    </p>
                </div>

            </section>

            <section className="flex min-w-0 flex-1 items-center justify-center px-4 py-6 sm:px-8 sm:py-12 lg:flex-none">
                <form
                    onSubmit={handleSubmit}
                    className="w-full max-w-md min-w-0 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8 dark:border-stone-800 dark:bg-stone-900"
                >
                    <Link href="/" className="inline-flex rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/40">
                        <ClinicLogo locale={locale} name={copy.clinicName} className="h-16 w-auto dark:invert" />
                    </Link>
                    <h2 className="mt-6 text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-50">
                        {copy.signUpTitle}
                    </h2>

                    <div className="mt-8 space-y-4">
                        <div>
                            <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-stone-800 dark:text-stone-200">
                                {copy.nameLabel}
                            </label>
                            <input id="name" name="name" value={form.name} onChange={handleChange} autoComplete="name" placeholder={copy.namePlaceholder} className={`${inputClassName} ${fieldErrors.name ? invalidInputClassName : validInputClassName}`} />
                            {fieldErrors.name && <p className={fieldErrorClassName}>{fieldErrors.name}</p>}
                        </div>
                        <div>
                            <label htmlFor="username" className="mb-1.5 block text-sm font-medium text-stone-800 dark:text-stone-200">
                                {copy.username}
                            </label>
                            <input id="username" type="text" name="username" value={form.username} onChange={handleChange} autoComplete="username" placeholder="pamela.smith" className={`${inputClassName} ${fieldErrors.username ? invalidInputClassName : validInputClassName}`} />
                            {fieldErrors.username && <p className={fieldErrorClassName}>{fieldErrors.username}</p>}
                        </div>
                        <div>
                            <label htmlFor="phoneNumber" className="mb-1.5 block text-sm font-medium text-stone-800 dark:text-stone-200">
                                {copy.phone}
                            </label>
                            <input id="phoneNumber" type="tel" name="phoneNumber" value={form.phoneNumber} onChange={handleChange} autoComplete="tel" placeholder="07XX XXX XXX" className={`${inputClassName} ${fieldErrors.phoneNumber ? invalidInputClassName : validInputClassName}`} />
                            {fieldErrors.phoneNumber && <p className={fieldErrorClassName}>{fieldErrors.phoneNumber}</p>}
                        </div>
                        <div>
                            <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-stone-800 dark:text-stone-200">
                                {copy.password}
                            </label>
                            <PasswordInput id="password" name="password" value={form.password} onChange={handleChange} autoComplete="new-password" placeholder={copy.passwordCreatePlaceholder} showLabel={copy.showPassword} hideLabel={copy.hidePassword} className={`${inputClassName} ${fieldErrors.password ? invalidInputClassName : validInputClassName}`} />
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
                        {submitting ? copy.creatingAccount : copy.createAccount}
                    </button>
                    <p className="mt-5 text-center text-sm text-stone-500 dark:text-stone-400">
                        {copy.haveAccount}{" "}
                        <Link
                            href="/login"
                            className="font-medium text-emerald-800 underline-offset-2 hover:underline dark:text-emerald-300"
                        >
                            {copy.logIn}
                        </Link>
                    </p>
                </form>
            </section>

            <footer className="bg-emerald-950 px-6 py-8 text-emerald-50 lg:hidden">
                <p className="text-sm font-medium tracking-[0.22em] text-emerald-200 uppercase">
                    {copy.clinicName}
                </p>
                <p className="mt-3 max-w-sm text-sm leading-6 text-emerald-100/85">
                    {copy.signUpFooter}
                </p>
            </footer>
        </div>
    );
}