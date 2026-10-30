# Advanced Library Book Reservation & Fine Management System

A Node.js + Express + MongoDB starter application with separate Student and Admin portals.

## Features included
- Separate role-based Student and Admin login.
- Student catalogue search and reservation requests.
- Student dashboard with reservations, loans, return requests, fines and notifications.
- Admin dashboard with live database statistics and a priority alert centre.
- Book, student, reservation, issue/return and fine management pages.
- Automatic overdue fine generation when an admin confirms a return.
- Configurable fine-per-day value.
- Low-stock, due-soon, overdue, unpaid-fine and pending-reservation alerts.
- Socket.IO events for dashboard refresh/updates.
- Chart.js borrowing activity chart.
- Tabler UI styling, Bootstrap 5, jQuery and SweetAlert2.

## Requirements
- Node.js 18+
- MongoDB Community Server or MongoDB Atlas

## Setup
1. Extract the ZIP.
2. Open the extracted folder in VS Code.
3. Install packages:
   ```bash
   npm install
   ```
4. Copy `.env.example` to `.env`.
5. Update `MONGODB_URI`, `SESSION_SECRET`, and admin credentials in `.env`.
6. Start MongoDB if using a local installation.
7. Create the first admin:
   ```bash
   npm run seed
   ```
8. Start the application:
   ```bash
   npm run dev
   ```
9. Open `http://localhost:3000`.

## First admin login
Use the email and password configured in `.env`:
- Default email: `admin@library.local`
- Default password: `ChangeMe123!`

Change the default password before using the app beyond local testing.

## Creating student accounts
This starter intentionally does not expose public student self-registration. Add student accounts through a controlled admin registration/import workflow. A student account requires:
- name
- email
- registrationNo
- department (optional)
- year (optional)
- passwordHash (bcrypt hash)
- role = `student`

For a quick local test, you can create a student document using MongoDB Compass after hashing a password with bcryptjs, or implement an authenticated admin-only student creation form.

## Important workflow
1. Student submits a reservation.
2. Admin reviews and approves/rejects the reservation.
3. Admin issues the book from Issue & Return.
4. Student can request a return.
5. Admin confirms the physical return.
6. The system updates inventory and generates an unpaid fine if the book is overdue.
7. Admin records payment only after receiving/confirming it.

## Configuration
- `FINE_PER_DAY`: fine amount per overdue day (default ₹5).
- `DUE_SOON_DAYS`: days before due date to raise a high-priority alert (default 3).
- `LOW_STOCK_THRESHOLD`: available-copy threshold for low-stock alerts (default 2).

## Security and production notes
This is an academic starter, not a production-certified library platform. Before deployment:
- Use HTTPS and a strong unique session secret.
- Configure secure cookies behind HTTPS.
- Add CSRF protection and rate limiting.
- Add password reset and admin-managed student creation.
- Add pagination and stricter validation for large datasets.
- Add transactional/atomic inventory updates for concurrent issue operations.
- Add a payment gateway only if online payments are required; the current app records admin-confirmed payments and does not process money.
- Review alert retention and audit logging policies.
- Back up MongoDB regularly.

## Current implementation boundaries
- Reservations are requests; admin approval does not itself issue the book.
- Admin issues books separately.
- Students can request a return; admin confirms the actual return.
- The app does not claim an online payment has happened. Fine status changes only through admin confirmation.
- PDF report export, full calendar UI, advanced stock forecasting and complete audit-log screens are extension points and are not represented as completed features.
