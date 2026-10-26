Veterinary Clinic App — Feature Roadmap

Phase 1: Authentication & User Management

* User registration and sign-in
* Role-based access control (Admin, Secondary Admin, Owner)
* Protect pages and server actions according to user permissions
* Owner profile management (name, phone number, email)
* Admin account setup and management
* Sign-out and session handling

Access rules:

* Admin: Full access to the application, including medical records.
* Secondary Admin: Can manage appointments and the pet shop, and view client contact information, but cannot access medical records.
* Owner: Can manage their account and access their own pets, appointments, and relevant medical information.

Phase 2: Pet Management

* Add a new pet
* View a list of the owner’s pets
* View an individual pet’s profile
* Edit pet information
* Upload or update a pet’s photo
* Record species, breed, sex, color, age/date of birth, weight, and diet
* Record whether the pet lives indoors, outdoors, or both
* Record whether the pet has been spayed or neutered
* Track weight history over time
* Allow owners to edit only the pet fields they’re permitted to change
* Allow admins to manage pet information

Phase 3: Medical Records & History

* View a pet’s medical history
* Record illnesses and medical conditions
* Record chronic conditions, allergies, and ongoing medications
* Record previous surgeries and spaying/neutering
* Record vaccinations and vaccination dates
* Record treatments, including flea/tick treatments and deworming
* Add notes to a pet’s medical history
* Add notes to individual visits
* Upload medical documents and files
* Allow owners to view their pets’ medical history
* Allow owners to download relevant medical documents
* Restrict medical record creation and editing to the admin
* Handle missing or unknown historical medical information

Phase 4: Appointment Management

4.1 Appointment Booking

* Allow owners to book appointments for their pets
* Display available appointment dates and times
* Allow owners to select an appointment type
* Allow owners to select a pet
* Support grooming options: shower, haircut, or both
* Show booking confirmation
* Display upcoming and past appointments
* Allow owners to cancel or reschedule appointments
* Prevent conflicting bookings
* Reserve appointment slots when bookings are made

4.2 Appointment Types

* Check-up
* Vaccination
* Treatment
* Grooming
* Operation, including spaying/neutering
* Follow-up visit

4.3 Scheduling Rules

* Monday–Friday: 9 AM–6 PM
* Saturday: 9 AM–2 PM
* Sunday: Closed
* Check-up: 30 minutes
* Vaccination/treatment: 30 minutes
* Grooming: 2 hours
* Cat operation: 1 hour
* Dog operation: 2 hours
* Operations must start between 9 AM and 11 AM
* Cat operations may start at 9 AM or 10 AM
* A dog operation occupies the full 9–11 AM period
* The last grooming appointment must start by 4 PM
* Allow the admin to block unavailable dates and times
* Ensure the schedule updates when appointments are booked, cancelled, or rescheduled
* Give scheduled appointments priority over unexpected walk-ins

Phase 5: Admin Dashboard & Appointment Operations

* Create the admin dashboard
* Display daily and upcoming appointments
* Display appointment details
* Search for clients by name, phone number, or pet name
* View client contact information
* View a client’s pets
* Manage appointments
* Block unavailable dates and times
* Display relevant pet and owner information without exposing medical records to the Secondary Admin
* Allow the admin to manage medical records from the relevant pet profile

Phase 6: Health Reminders

* Calculate future vaccination due dates when sufficient medical information is available
* Support manually setting a due date when historical dates are unknown
* Display upcoming and overdue vaccinations
* Display upcoming and overdue treatments
* Display reminders on the owner’s dashboard
* Display relevant reminders on the admin dashboard
* Allow the admin to edit due dates
* Allow owners to book appointments from a reminder
* Stop reminder notifications when an appointment is booked
* Handle cancelled appointments so reminders can become active again
* Mark reminders as completed when the relevant vaccination or treatment is administered
* Create the next reminder when the next due date can be determined

Important: Confirm vaccination and treatment intervals with the vet before implementing automatic calculations.

Phase 7: Pet Shop & Inventory

7.1 Product Catalogue

* Display products in the pet shop
* Organize products into categories:
    * Dog food
    * Cat food
    * Dog accessories and toys
    * Cat accessories and toys
    * Ruminant products
    * Medication
* Allow admins to add and manage categories
* Filter products where relevant, including food products
* Display product details, images, prices, and availability
* Support product variants where needed

7.2 Inventory Management

* Add products
* Edit product details
* Delete products
* Update stock quantities
* Track product availability
* Handle product variants and their stock
* Prevent orders for unavailable or insufficient stock

7.3 Orders

* Allow owners to browse products
* Allow owners to add products to a cart
* Allow owners to place orders
* Allow owners to view their orders
* Allow admins to review and approve orders
* Allow admins to manage order status
* Reserve or adjust inventory appropriately when orders are placed, approved, cancelled, or fulfilled
* Support cash on delivery
* Support the agreed Whish payment workflow
* Allow admins to manage delivery
* Notify admins of new orders

Note: Finalize the Whish payment workflow before implementing it.

Phase 8: Notifications

* Notify owners about appointment bookings
* Notify owners about appointment cancellations and rescheduling
* Send appointment reminders approximately two hours before the appointment
* Send health reminders ahead of vaccination or treatment due dates
* Notify admins about new bookings
* Notify admins about cancellations and rescheduling
* Notify admins about new orders
* Notify owners about relevant order updates
* Implement push notifications if supported by the final PWA setup
* Ensure notifications are not repeatedly sent when they have already been handled

Phase 9: Clinic Information & Emergency Features

* Create an About page
* Display clinic contact information
* Display clinic working hours
* Link to the clinic’s location on Google Maps
* Add a button to call the clinic
* Add a WhatsApp contact button
* Provide emergency contact options
* Handle emergencies outside working hours by directing users to the appropriate alternative vet
* Provide a QR code that links to the application

Phase 10: Pet Profiles & Additional Information

* Display grooming history where relevant
* Display previous appointments on each pet’s profile
* Display medical documents associated with the pet
* Display relevant vaccination and treatment records
* Keep the pet’s information, medical history, and appointments organized in one place

Phase 11: Internationalization & Mobile Experience

* Support English
* Support Arabic
* Implement correct right-to-left layout for Arabic
* Make all pages responsive
* Optimize forms and navigation for mobile screens
* Ensure the app works well on common mobile browsers
* Configure the application as a Progressive Web App (PWA)
* Allow users to install the app on their devices
* Configure the service worker and push notifications if required

Phase 12: Testing, Deployment & Delivery

Testing

* Test registration and sign-in
* Test role permissions and access restrictions
* Test pet creation, editing, and viewing
* Test medical records and document access
* Test appointment booking, cancellation, and rescheduling
* Test scheduling conflicts and special operating rules
* Test health reminder calculations and status changes
* Test inventory and order management
* Test notifications
* Test Arabic and right-to-left layouts
* Test mobile responsiveness
* Test important user workflows from beginning to end

Deployment

* Prepare production environment variables
* Configure the production database
* Apply database migrations
* Deploy the application
* Test the deployed application
* Fix critical bugs
* Verify that authentication and permissions work in production
* Provide the clinic with the application link and QR code