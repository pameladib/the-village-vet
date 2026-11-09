## Cron Scheduling

Vercel Cron schedules use UTC and do not automatically account for  Lebanon's daylight saving time.

Lebanon switches between:
- Winter: UTC+2
- Summer: UTC+3

We want all reminders to be sent at approximately (Vercel might not send them at exactly 8) 8:00 AM Beirut time throughout the year, rather than having them shift to 9:00 AM during summer.

To achieve this, we configure two daily Cron schedules in vercel.json:

- `0 5 * * *` — 5:00 AM UTC
- `0 6 * * *` — 6:00 AM UTC

Their corresponding Beirut times are:

| Cron schedule | Winter (UTC+2) | Summer (UTC+3) |
|     ---       |     ---        |   ---          |
| 5:00 AM UTC   |     7:00 AM    | 8:00 AM        |
| 6:00 AM UTC   |     8:00 AM    | 9:00 AM        |

Both schedules call the same API route: `/api/cron/reminders`.

The API route checks the current time in the `Asia/Beirut` timezone. It only proceeds with creating and sending notifications if the local hour is 8. Otherwise, it returns immediately without creating any notifications. This is to prevent the same notifications to be sent more than once (we introduced 2 cron jobs not to send each notification twice, but to make sure it is sent at 8 AM regardless of whether it's winter or summer in Lebanon so we want the suitable cron job to trigger the notification)

Consequently:
- During winter, the 6:00 AM UTC execution sends the reminders.
- During summer, the 5:00 AM UTC execution sends the reminders.
- The other cron job sends a request to the API route but the function returns immediately without creating and sending any notifications.

This ensures reminders are sent at approximately 8:00 AM Beirut time throughout the year.

### Additional considerations

**Vercel Hobby plan limitations**

- Hobby Cron jobs can execute at most once per day per schedule. We therefore cannot schedule separate executions for different reminder times throughout the day.
- All scheduled reminders (appointments, vaccines and treatments) are processed during the morning execution.

**Execution precision**

Vercel does not guarantee exact minute-level execution on Hobby accounts. A Cron job scheduled for a particular hour can execute at any point during that hour.

Therefore, reminders may be sent between 8:00 and 8:59 AM Beirut time.

This is acceptable for Vet Village because the purpose is to remind owners about their appointments before the clinic opens at 9:00 AM, rather than to deliver notifications at an exact minute.