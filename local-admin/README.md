# UnikTrades Local Admin

Investment + ops console (no trading queues like setups, TP claims, or MT5).

## Local setup

```bash
cd local-admin
cp .env.example .env
npm install
npm run dev
```

Open http://localhost:3099 and sign in with an **ADMIN** account.

```env
VITE_API_URL=/api/v1
VITE_PROXY_TARGET=http://localhost:4001
# Or production API:
# VITE_PROXY_TARGET=https://YOUR-API.onrender.com
```

In **dev**, Vite proxies `/api/v1` → `VITE_PROXY_TARGET` (avoids CORS).

## Host on Render (static admin)

The admin is a Vite SPA. On Render there is **no Vite proxy** — the browser must call the API directly, and the API must allow the admin origin in CORS.

### 1. Prepare the API (Render → your UnikTrades API service)

Set / merge env vars (comma-separated origins are supported):

```env
FRONTEND_URL=https://uniktrades.com,https://www.uniktrades.com,https://admin.uniktrades.com
PUBLIC_APP_URL=https://uniktrades.com
API_PUBLIC_URL=https://uniktrades.com
```

Redeploy the API after saving. CORS already allows `uniktrades.com` / `admin.uniktrades.com` in code; `FRONTEND_URL` still drives email links and cookie-style flows.

### 2. Create a Render Static Site (or Web Service)

**Option A — Static Site (recommended)**

1. Render Dashboard → **New** → **Static Site**
2. Connect `uniktrades` GitHub repo
3. Settings:
   - **Root Directory:** `local-admin`
   - **Build Command:** `npm install && npm run build`
   - **Publish Directory:** `dist`
4. **Environment** (build-time — required):

```env
VITE_API_URL=https://YOUR-API-SERVICE.onrender.com/api/v1
```

Use your real UnikTrades API host (not the old traders-c53s service unless that *is* UnikTrades).

5. Deploy. You’ll get something like `https://uniktrades-admin.onrender.com`.

**Option B — Web Service with `serve`**

Same root/build, then:

- **Start Command:** `npx serve -s dist -l $PORT`
- Same `VITE_API_URL` build env

### 3. Custom domain for admin

1. In Render → admin service → **Custom Domains** → add `admin.uniktrades.com`
2. At your DNS provider for `uniktrades.com`, add the CNAME Render shows (e.g. `admin` → `….onrender.com`)
3. Wait for HTTPS to provision
4. Confirm API `FRONTEND_URL` includes `https://admin.uniktrades.com`

### 4. Point the public site to `uniktrades.com`

On the **frontend** (Next.js) Render service:

1. Custom domain: `uniktrades.com` + `www`
2. Env (examples):

```env
NEXT_PUBLIC_API_URL=https://YOUR-API.onrender.com/api/v1
```

On the **API** service, set `FRONTEND_URL` / `PUBLIC_APP_URL` / `API_PUBLIC_URL` to `https://uniktrades.com` (and www if you use it).

### Security notes

- Admin login is still JWT + ADMIN role — anyone who finds the URL can hit the login page. Prefer a private subdomain (`admin.uniktrades.com`), do not advertise it, and use a strong admin password + login OTP if enabled.
- Optional: Render IP allowlist / Cloudflare Access in front of `admin.uniktrades.com`.
- Never put secrets in `VITE_*` except the public API base URL.

## Wallet tab

Full admins see a custody wallet (NOWPayments balance) with **Deposit** and **Withdraw**. This funds platform payouts — it does not credit user wallets.
