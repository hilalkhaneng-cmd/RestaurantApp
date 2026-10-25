# 🍽️ RestaurantApp — Full-Stack Mobile & Backend Solution (Firebase Edition)

A modern full-stack restaurant food ordering and table reservation mobile application built with **React Native / Expo Router** and a dedicated **Node.js / Express** backend powered by **Firebase Firestore**.

---

## 📋 Table of Contents
1. [Architecture Overview](#-architecture-overview)
2. [Root-Cause Resolution: iPhone Menu Loading](#-root-cause-resolution-iphone-menu-loading)
3. [Firebase Firestore Database](#-firebase-firestore-database)
4. [Installation & Setup](#-installation--setup)
5. [Starting the Application](#-starting-the-application)
6. [Seed Data & Demo Accounts](#-seed-data--demo-accounts)
7. [Automated Testing](#-automated-testing)
8. [API Endpoints Reference](#-api-endpoints-reference)
9. [Postman Collection](#-postman-collection)
10. [Submission Checklist & Screenshots](#-submission-checklist--screenshots)
11. [Viva Questions & Answers](#-viva-questions--answers)

---

## 🏛️ Architecture Overview

- **Frontend:** Expo SDK 57, React Native, TypeScript, Expo Router (file-based navigation with `(tabs)` and `(auth)` groups).
- **Backend:** Node.js / Express REST API running on **Port 5050**.
- **Database:** **Google Firebase Firestore** via Firebase Admin SDK. All MongoDB/Mongoose code has been completely removed.
- **Security:** Stateless 1-day JWT Bearer tokens, bcrypt (12 rounds) password hashing, server-side RBAC (`customer` vs `manager`), and server-calculated order totals.

---

## 🔍 Root-Cause Resolution: iPhone Menu Loading

### Problem
Physical iOS devices displayed **"Could not load the menu."**

### Diagnosis
1. The development Mac's LAN IP changed via DHCP from `192.168.18.93` to `192.168.18.111`.
2. Hardcoded endpoints failed to adapt dynamically to host IP changes.

### Solution
- `src/constants/api.ts` implements **Dynamic Host Resolution** extracting the Mac's IP from `Constants.expoConfig.hostUri` (Expo Metro bundler).
- Port aligned to **5050** per assignment requirements.
- Configurable override via `EXPO_PUBLIC_API_HOST`.
- Integrated mobile loading spinners, pull-to-refresh (`RefreshControl`), and error retry buttons.

---

## 🗄️ Firebase Firestore Database

### Collections
- `users`: User profiles with bcrypt hashed passwords. Public registration is locked to `role: 'customer'`.
- `menuItems`: Authoritative dish catalog (18 pre-seeded items across 8 categories).
- `tables`: Dining tables with seating capacities (Tables 1 through 6).
- `orders`: Food orders. Server calculates prices from menu documents. Status: `Pending` → `Preparing` → `Ready` → `Served`.
- `reservations`: Table bookings. Validates capacity and prevents overlapping time conflicts (±90 min slot window).

---

## 🚀 Installation & Setup

### 1. Prerequisites
- Node.js (v18+)
- Firebase Admin credentials at `server/firebase-service-account.json`

### 2. Install Dependencies
```bash
# Frontend dependencies
npm install

# Backend dependencies
cd server
npm install
cd ..
```

### 3. Environment Variables
Verify `server/.env`:
```env
PORT=5050
JWT_SECRET=rA8fP2mK9xQzLnVjTwYc5sBhE3uDgNiR7oUdX6pWvZ4aGyJeCqk
```

---

## 🏃 Starting the Application

### 1. Start the Backend API (Port 5050)
```bash
cd server
npm start
```
*Health check URL: `http://localhost:5050/api/health`*

### 2. Start the Mobile App
In another terminal:
```bash
cd RestaurantApp
npx expo start
```
- Open **Expo Go** on your iPhone / Android device and scan the QR code.
- Or press `i` for iOS Simulator, `a` for Android Emulator, or `w` for Web.

---

## 🌱 Seed Data & Demo Accounts

Run the idempotent seed script to populate Firestore with sample users, tables, and 16+ dishes:
```bash
cd server
node scripts/seed-data.js
```

### Pre-Seeded Accounts:
- **Customer Account:** `customer@restaurant.local` &bull; Password: `Customer123!`
- **Manager Account:** `manager@restaurant.local` &bull; Password: `Manager123!`

### Provision an Additional Manager:
```bash
node scripts/create-manager.js "Head Chef" chef@restaurant.local ChefSecret123!
```

---

## 🧪 Automated Testing

Run the full integration test suite (32 tests covering health, auth, menu, tables, orders, and reservations):
```bash
cd server
npm test
```
**Result:** `32 passed, 32 total` (100% pass rate).

### Frontend Typecheck:
```bash
npx tsc --noEmit
```
**Result:** `0 errors`.

---

## 📡 API Endpoints Reference (Port 5050)

| Method | Endpoint | Access | Description |
|---|---|:---:|---|
| `GET` | `/api/health` | Public | System health & Firestore verification |
| `POST` | `/api/auth/register` | Public | Customer registration (customer role only) |
| `POST` | `/api/auth/login` | Public | Login & receive 1-day JWT Bearer token |
| `GET` | `/api/auth/me` | Authenticated | View authenticated user profile |
| `GET` | `/api/menu` | Public | List menu (`?category=` and `?search=` supported) |
| `GET` | `/api/menu/categories` | Public | Unique category list |
| `GET` | `/api/menu/:id` | Public | Get single menu item |
| `POST` | `/api/menu` | Manager Only | Create new menu item |
| `PUT` | `/api/menu/:id` | Manager Only | Update menu item details/price |
| `DELETE` | `/api/menu/:id` | Manager Only | Delete menu item |
| `GET` | `/api/tables` | Public | List tables and capacities |
| `GET` | `/api/tables/:tableNumber` | Public | Get table details |
| `POST` | `/api/orders` | Authenticated | Place order (total computed server-side) |
| `GET` | `/api/orders/my` | Customer | Customer views their own orders |
| `GET` | `/api/orders` | Manager | Manager views all customer orders |
| `PATCH` | `/api/orders/:id/status` | Manager Only | Progress status: `Pending` → `Preparing` → `Ready` → `Served` |
| `DELETE` | `/api/orders/:id` | Customer | Cancel order (allowed only if `Pending`) |
| `GET` | `/api/reservations/availability` | Authenticated | Check table availability for date & time |
| `POST` | `/api/reservations` | Authenticated | Book table (validates capacity & prevents conflict) |
| `GET` | `/api/reservations/my` | Customer | Customer views own bookings |
| `GET` | `/api/reservations` | Manager | Manager views all reservations |
| `PATCH` | `/api/reservations/:id/status` | Manager Only | Accept/Decline reservation (`Confirmed`, `Declined`) |
| `DELETE` | `/api/reservations/:id` | Customer | Cancel booking and free table |

---

## 📮 Postman Collection

Import `RestaurantApp_Postman_Collection.json` into Postman:
- Preconfigured variable: `baseUrl = http://192.168.18.111:5050/api`
- Folders: Health, Auth, Menu, Tables, Orders, Reservations.
- Contains both success assertions and failure cases (400 validation, 401 unauth, 403 forbidden, 409 conflict).

---

## 📷 Submission Checklist & Screenshots

### Screenshots Required:
1. `GET /api/health` in browser showing `database: "Firebase Firestore"`.
2. Terminal showing `npm test` with 32 passed tests.
3. Mobile **Menu Tab** loaded with real Firestore dishes.
4. Mobile **Cart & Checkout** showing line items and calculated total.
5. Mobile **Orders Tab** showing real-time order tracking (`Pending` status).
6. Mobile **Reserve Tab** showing table selection and confirmed booking.
7. Mobile **Profile Tab** showing customer and manager role badges.

### Two-Device Video Demonstration Checklist:
1. **Device 1 (Phone):** Log in as customer, place an order for a Pizza, and observe status `Pending`.
2. **Device 2 (Laptop/Simulator):** Log in as manager, view the order list, click `Mark as Preparing`, and see the status change.
3. **Device 1 (Phone):** Watch the mobile screen update to `Preparing` via live 10s polling without refreshing.
4. **Device 1 (Phone):** Book Table 3 for a specific date and time.
5. **Device 2 (Manager):** View reservation and accept it (`Confirmed`).

---

## 🎓 Viva Questions & Answers

**Q1: Why did you choose Firebase Firestore exclusively?**
> **A:** Firebase Firestore provides a fully-managed, highly-scalable cloud NoSQL database that requires zero local server infrastructure or IP whitelisting headaches. It integrates natively with Firebase Admin SDK, ensuring high availability, sub-second query latency, and seamless document-level security.

**Q2: How do you prevent customers from changing their role to manager?**
> **A:** The `POST /api/auth/register` endpoint ignores any role sent by the client and hardcodes `role: 'customer'`. Manager accounts can only be provisioned through the secure server CLI script `node scripts/create-manager.js`.

**Q3: How are order prices protected from tampering?**
> **A:** The client only sends the `menuItemId` and `quantity`. The server fetches the authoritative document from the `menuItems` Firestore collection, verifies the price and availability, and recalculates the line totals and final total server-side.

**Q4: How does the reservation conflict engine work?**
> **A:** When booking, the server checks the `tables` collection to ensure party size does not exceed table capacity. Then, it queries Firestore for existing non-cancelled reservations for that table on that date. It evaluates the time difference: if a booking falls within a 90-minute dining window of another reservation, it rejects with HTTP 409 Conflict.
