const widths = {
    wide: "max-w-6xl",
    medium: "max-w-5xl",
    form: "max-w-lg",
} as const;

export default function Page({
    width = "medium",
    children,
    className = "",
}: {
    width?: keyof typeof widths;
    children: React.ReactNode;
    className?: string;
}) {
    return <main className={`mx-auto w-full ${widths[width]} px-4 py-6 sm:px-6 lg:px-8 ${className}`}>{children}</main>;
}
