# UnikTrades Local Admin

**Runs on your machine only** — not deployed to Render or the public site.

Investment + ops console (no trading queues like setups, TP claims, or MT5).

## Setup

```bash
cd local-admin
cp .env.example .env
npm install
npm run dev
```

Open http://localhost:3099 and sign in with your **ADMIN** account  
(default seed: `admin@uniktrades.com` / `Admin123!ChangeMe` — or the email seeded in your DB).

Requests go through the Vite dev proxy (`/api/v1` → API) so the browser is not blocked by CORS.

## Configure API

In `.env`:

```env
VITE_API_URL=/api/v1
VITE_PROXY_TARGET=https://your-api.onrender.com

# Or local backend (run `npm run start:dev` in backend/ first):
# VITE_PROXY_TARGET=http://localhost:4000
```

## Wallet tab

Full admins can **deposit** (credit) or **withdraw** (debit) USDT on any user’s platform wallet via the Wallet tab. Restricted finance viewers do not see these controls.
