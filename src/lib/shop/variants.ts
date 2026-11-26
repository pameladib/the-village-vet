export function sellableName(name: string, label: string) {
    const trimmed = label.trim();
    return trimmed ? `${name} · ${trimmed}` : name;
}

export function offerSummary(variants: { price: number; stock: number }[]) {
    const prices = variants.map((variant) => variant.price);
    const min = prices.length > 0 ? Math.min(...prices) : 0;
    return {
        min,
        from: prices.some((price) => price !== min),
        stock: variants.reduce((sum, variant) => sum + variant.stock, 0),
    };
}
