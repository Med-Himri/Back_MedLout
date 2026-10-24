# Medlout Auto — API

Express + MongoDB API for the Medlout Auto shop and its admin.

## Run locally

```bash
cp .env.example .env   # fill in the values
npm install
npm run dev            # http://localhost:5000
```

## First admin account

There is no public sign-up. Either:

- set `ADMIN_EMAIL` to the email of an existing account (that account is always an admin), or
- run `node scripts/create-admin.js you@example.com "Your Name" "a-strong-password"`.

Admins can then add staff from the admin panel (**Équipe** page).

## Roles

| | staff | admin |
|---|---|---|
| Orders, products, messages | ✓ | ✓ |
| Delete orders | | ✓ |
| Manage staff accounts | | ✓ |

## API overview

| Method | Path | Access |
|---|---|---|
| POST | `/api/order/create` | public (rate limited) — prices are computed on the server |
| GET / PATCH / DELETE | `/api/order`, `/api/order/:id` | staff (delete: admin) |
| GET | `/api/admin/dashboard` | staff |
| POST | `/api/message` | public (rate limited) |
| GET / PATCH / DELETE | `/api/message`, `/api/message/:id` | staff |
| GET | `/api/product/getallproducts`, `/api/product/:slug` | public |
| GET | `/api/product/getproducts`, `/api/product/admin/:id` | staff |
| POST | `/api/product/addproduct`, `updateproduct`, `createaiproduct`, `acceptproduct`, `delete` | staff |
| POST | `/api/user/login`, `forgot-password`, `reset-password` | public (rate limited) |
| GET / POST | `/api/user/me`, `/api/user/change-password` | signed in |
| GET / POST / PATCH / DELETE | `/api/user/staff` | admin |
