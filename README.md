# The Village Vet

A bilingual clinic system for a veterinary practice in Lebanon. Owners manage their pets, book visits, and order from the clinic shop. Staff run the day: appointments, medical records, reminders, and inventory.

The live site is [thevillagevetlb.com](https://thevillagevetlb.com).

## Who uses it

**Pet owners** keep a record for each pet, book and move visits, read reminders, and place shop orders. They see their own animals only.

**The veterinarian** sees the full clinical record: visits, vaccinations, treatments, weight, documents, and follow-ups.

**Clinic staff** manage the schedule, the shop, and client contact details. They do not see medical records.

The interface is in English and Arabic, including right-to-left layout.

## What it covers

- Pet profiles, photos, and weight history
- Vaccinations and treatments, with the next due date suggested from the last dose
- Appointments for check-ups, grooming, and operations, with separate clinic and grooming calendars
- Opening hours, schedule blocks, and conflict checks so two visits cannot take the same time
- Care reminders and visit follow-ups
- A pet shop with stock, reserved quantities, and orders paid by cash or Whish at the clinic
- Notices in the app and web push, including a daily reminder job
- An installable app, with a QR code that opens the site

## Built with

Next.js, React, TypeScript, Tailwind CSS, Prisma, PostgreSQL, Better Auth, and Supabase for private files.

Configuration is listed in [`.env.example`](.env.example). Values stay out of the repository.
