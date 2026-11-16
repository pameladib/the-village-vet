import type { Copy } from "@/lib/i18n";

const titles: Record<string, keyof Copy> = {
    "New shop order": "noticeOrderNew",
    "Order declined": "noticeOrderDeclined",
    "Order completed": "noticeOrderCompleted",
    "Order being prepared": "noticeOrderPreparing",
    "Order on the way": "noticeOrderOut",
    "Order approved": "noticeOrderApproved",
    "Appointment booked": "noticeApptBooked",
    "Appointment cancelled": "noticeApptCancelled",
    "Appointment rescheduled": "noticeApptMoved",
    "Appointment today": "noticeApptToday",
    "Appointment tomorrow": "noticeApptTomorrow",
    "Care is due today": "noticeCareDue",
    "Care is still due": "noticeCareStill",
    "New client account": "noticeNewClient",
};

const bodies: Record<string, keyof Copy> = {
    "This order is waiting for the clinic to approve it. It is not confirmed yet.": "noticeOrderNewBody",
    "The clinic declined this order.": "noticeOrderDeclinedBody",
    "Your order has been delivered.": "noticeOrderDelivered",
    "Your order is complete.": "noticeOrderCompletePickup",
    "The clinic is preparing your order.": "noticeOrderPreparingBody",
    "Your order is on the way.": "noticeOrderOutBody",
    "The clinic approved your order. It will be delivered soon.": "noticeOrderApprovedDelivery",
    "The clinic approved your order. You can pick it up at the clinic.": "noticeOrderApprovedPickup",
    "The clinic updated your shop order.": "noticeOrderUpdated",
    "A shop order was updated.": "noticeOrderStaff",
    "A visit was booked. Open the dashboard to see the time.": "noticeApptBookedBody",
    "A visit was cancelled.": "noticeApptCancelledBody",
    "A visit was moved to a new time.": "noticeApptMovedBody",
    "You have a visit today.": "noticeApptTodayBody",
    "You have a visit tomorrow.": "noticeApptTomorrowBody",
};

export function presentNotice(item: { title: string; body: string }, copy: Copy) {
    const titleKey = titles[item.title];
    const bodyKey = bodies[item.body];
    let body = bodyKey ? copy[bodyKey] : item.body;
    const client = item.body.match(/^(.*) created an account\.$/);
    if (client?.[1]) body = copy.noticeNewClientBody.replace("{name}", client[1]);
    const care = item.body.match(/^(.*) has a vaccination or treatment to book\.$/);
    if (care?.[1]) body = copy.noticeCareBody.replace("{name}", care[1]);
    return {
        title: titleKey ? copy[titleKey] : item.title,
        body,
    };
}
