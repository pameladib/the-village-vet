export function whatsappHref(value: string) {
    const digits = value.replace(/\D/g, "");
    return digits.length >= 8 ? `https://wa.me/${digits}` : null;
}

// Lebanese mobiles are often stored with a leading 0. WhatsApp needs the country code.
export function ownerChat(phone: string) {
    const digits = phone.replace(/\D/g, "");
    const international = digits.startsWith("00")
        ? digits.slice(2)
        : digits.startsWith("0")
            ? `961${digits.slice(1)}`
            : digits;
    return whatsappHref(international);
}
