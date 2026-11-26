import type { Copy } from "@/lib/i18n";

export function mapShopError(message: string | undefined, copy: Copy) {
    if (message === "You need a staff account.") return copy.shopErrStaff;
    if (message === "Add a photo.") return copy.shopPhotoRequired;
    if (
        message?.startsWith("A photo")
        || message === "That file is not a valid photo."
        || message === "Could not store the photo."
        || message === "Could not prepare the upload."
        || message === "Could not store the file."
        || message === "File storage is not set up yet."
    ) return copy.shopErrPhotoFile;
    if (message === "This product is on an order, so it can be hidden instead of deleted.") return copy.shopErrOnOrder;
    if (message === "A version that is already on an order stays on the product.") return copy.shopErrVersionOrder;
    if (message === "This order changed.") return copy.shopErrConflict;
    if (message === "Enter the customer’s name and phone.") return copy.shopErrCustomer;
    if (message === "Choose at least one product.") return copy.shopErrItems;
    if (message === "Enter the delivery address.") return copy.shopAddressRequired;
    if (message === "Enter a contact number.") return copy.shopPhoneRequired;
    if (message === "Something in the cart is no longer in stock.") return copy.shopErrLineStock;
    if (message === "Enter a delivery fee of zero or more.") return copy.shopErrDeliveryFee;
    if (message === "The pricing currency changed. Refresh the page and enter the price again.") return copy.pricingErrCurrency;
    if (message === "That order can no longer be changed." || message === "That status change is not allowed.") return message === "That status change is not allowed." ? copy.shopErrTransition : copy.shopErrOrder;
    if (message === "Approve the order before fulfilling it.") return copy.shopErrFulfil;
    if (message === "That product was not found." || message === "That order was not found." || message === "That category was not found.") return copy.shopErrMissing;
    if (message === "This category still has products, so it cannot be deleted.") return copy.shopCategoryInUse;
    if (message === "A category with that English name already exists.") return copy.shopCategoryExists;
    return copy.shopErrDetails;
}

