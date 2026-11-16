export default function SpeciesMark({ species, className }: { species: "CAT" | "DOG"; className?: string }) {
    if (species === "CAT") {
        return (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
                <path d="M8 10 6 4.5 11 8" />
                <path d="M16 10 18 4.5 13 8" />
                <circle cx="12" cy="14" r="6" />
                <path d="M10 14.5h.01M14 14.5h.01" />
            </svg>
        );
    }

    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
            <path d="M8 9.5c-2.5.4-4 2.2-4 4.2 0 1.4.6 2.2 1.4 2.6" />
            <path d="M16 9.5c2.5.4 4 2.2 4 4.2 0 1.4-.6 2.2-1.4 2.6" />
            <circle cx="12" cy="14" r="6" />
            <path d="M10 14.5h.01M14 14.5h.01" />
        </svg>
    );
}
