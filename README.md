# Traveloop — Fullstack

Monorepo containing:

- **`frontend/`** — React + Vite client (uploaded by you), now wired to the real API
- **`backend/`**  — Node.js + Express + MySQL REST API

## 1. Start MySQL

Make sure a local MySQL 8+ server is running (or use any managed MySQL).
Note your credentials.

## 2. Run the backend

```bash
cd backend
npm install
cp .env.example .env        # edit DB_USER / DB_PASSWORD / JWT_SECRET
npm run migrate             # creates `traveloop` DB + tables
npm run seed                # optional: seed cities catalog
npm run dev                 # API at http://localhost:4000
```

## 3. Run the frontend

```bash
cd frontend
npm install
cp .env.example .env        # VITE_API_URL=http://localhost:4000/api
npm run dev                 # app at http://localhost:5173 (or shown port)
```

Open the app, sign up, and your data is now persisted in MySQL through
the Express API. The frontend's `AppContext` has been rewritten to call
the backend (`/api/auth/*`, `/api/trips/*`, etc.) instead of localStorage.
The JWT is stored in `localStorage` under `traveloop_token` and
auto-attached as `Authorization: Bearer …` on every request.

## API quick reference

See `backend/README.md` for the full route list.

## Production notes

- Set strong `JWT_SECRET` in `backend/.env`.
- Set `CORS_ORIGIN` to the deployed frontend URL.
- Build the frontend with `npm run build` and serve `frontend/dist` from any
  static host (Nginx, Vercel, Netlify, S3 + CloudFront).
- Deploy the backend to any Node host (Render, Railway, Fly.io, EC2, …).
