# Carsafi

A static vehicle service desk prototype for registration, wash logging, customer history, payment tracking and collection reports.

## Run on the different device

Open `index.html` directly in a browser for a quick static demo. Service entries are persisted in browser local storage under `carsafi-services`.

## Run on another device on different network

1. Open a terminal in the project folder.
2. Run: `npm install` (only first time) and then `npm start`
3. Note the local URL, such as `http://localhost:3000`
4. Find your computer's local IP address, for example with `ipconfig` on Windows.
5. On another device connected to the different Wi‑Fi, open: `http://<your-computer-ip>:3000`

This serves the prototype over the network so it can be used from a second device without changing the app logic.

> Note: this is still a prototype. Data is stored per browser in local storage, so entries are not shared across different devices unless a backend/database is added.

## Included

- Dashboard with daily service, collection and debt metrics
- Service log with vehicle plate, type, wash, attendant, date/time and payment status
- Log service modal with local persistence
- Customer history grouped by customer and vehicle
- Weekly collection and payment health report view
- Role-based local sign-in for administrators and users
- Service entries show the administrator or user who logged them
- PostgreSQL-ready relational schema in `schema.sql`

For a production implementation, replace the local-storage calls in `app.js` with API requests backed by the tables and `service_payment_status` view in `schema.sql`.

## Demo accounts

- Administrator: `admin@carsafi.test` / `admin123`
- User: `user@carsafi.test` / `user123`

Both roles can log services. Reports are available to administrators only.
