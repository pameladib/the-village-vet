export async function resolve(specifier, context, nextResolve) {
    const relative = specifier.startsWith("./") || specifier.startsWith("../");
    const hasExtension = specifier.endsWith(".ts") || specifier.endsWith(".js") || specifier.endsWith(".json") || specifier.endsWith(".mjs");
    if (!relative || hasExtension) return nextResolve(specifier, context);
    try {
        return await nextResolve(specifier, context);
    } catch (error) {
        if (error && typeof error === "object" && "code" in error && error.code === "ERR_MODULE_NOT_FOUND") {
            return nextResolve(`${specifier}.ts`, context);
        }
        throw error;
    }
}
