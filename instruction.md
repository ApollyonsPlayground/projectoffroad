# SoCal Off-Roaders — setup and roadmap (source of truth)

This file summarizes how the app is wired (Supabase, Vercel, Capacitor) and what to run locally. It complements the four product pillars: Trail Explorer, SOS, PWA/Capacitor, and community (auth + saved trails).

## 1. Environment variables

Copy [.env.example](.env.example) to `.env.local` and fill:

| Variable | Where it is used |
|----------|------------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Browser + server (Supabase project URL) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser — legacy **anon** JWT (still supported). |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Optional alternative to anon — same slot in `@supabase/ssr` clients & [middleware](middleware.ts); if both are set, publishable wins. |
| `SUPABASE_SERVICE_ROLE_KEY` | **Seeding trails** and **server `/api/admin/*` routes** (owner panel). The anon key cannot insert past RLS. On Vercel, add as a normal server env var (not “Exposed to browser”). Never prefix with `NEXT_PUBLIC_`. |
| `SIGHTENGINE_API_USER` / `SIGHTENGINE_API_SECRET` | Optional. Powers **image nudity scan** before post images are stored. [Sightengine](https://sightengine.com). If unset, scans are skipped and new image posts get `moderation_status = pending_no_engine`. |

**Vercel:** add the two `NEXT_PUBLIC_*` variables for Production and Preview. Add **`SUPABASE_SERVICE_ROLE_KEY`** for the admin API routes to work in production. Do **not** expose the service role key to the client.

**If auth suddenly fails everywhere:** Open **`/api/health/supabase`** on that deployment (e.g. `https://yoursite.com/api/health/supabase`). It checks reachability of your project’s Auth service (`/auth/v1/health`). **`configured: false`** means env vars are missing on the server. **`ok: false`** with a 4xx/5xx often means the Supabase project is **paused** (free tier), **unhealthy**, or the URL is wrong — check the [Supabase dashboard](https://supabase.com/dashboard) and [status](https://status.supabase.com).

Restart `npm run dev` after changing `NEXT_PUBLIC_*` values.

Optional: **`NEXT_PUBLIC_CLUB_VERIFICATION_EMAIL`** — overrides the default **`socaloffroaders@socaloffroaders.com`** inbox for club verification mailto + copy on [clubs/create](src/app/clubs/create/page.tsx).

### Google sign-in (`Unsupported provider: provider is not enabled`)

Login uses **Google OAuth** via Supabase (`signInWithOAuth({ provider: 'google' })`). The error **`validation_failed` / provider not enabled** means the **Google provider is off or incomplete** in Supabase — not an app bug.

1. **Supabase Dashboard** → **Authentication** → **Providers** → **Google** → turn **Enable Sign in with Google** on.
2. In **Google Cloud Console** → **APIs & Services** → **Credentials** → **Create OAuth client ID** (Web application). Under **Authorized redirect URIs**, add exactly:
   - `https://<YOUR_PROJECT_REF>.supabase.co/auth/v1/callback`
   (Copy **Project URL** host from Supabase **Settings** → **API** if unsure.)
3. Paste **Client ID** and **Client Secret** into the Supabase Google provider form and **Save**.

**Two different places (easy to mix up):** In **Google Cloud**, *Authorized redirect URIs* must include **only** the Supabase callback: `https://<PROJECT_REF>.supabase.co/auth/v1/callback`. Your **app** URLs (`https://yoursite.com/auth/callback/`, `http://192.168.x.x:3000/auth/callback/`, etc.) belong in **Supabase → Authentication → URL Configuration → Redirect URLs**, not as a substitute in Google. Google never sends the user straight to your domain first; it sends them to Supabase, which then redirects to your `redirectTo` URL with `?code=`.

4. **Authentication** → **URL Configuration** → **Redirect URLs**: include the OAuth **callback** route this app uses (and your deployed origins). Examples:
   - `http://localhost:3000/auth/callback/`
   - `http://127.0.0.1:3000/auth/callback/`
   - `https://your-deployment.vercel.app/auth/callback/`
   - `https://your-custom-domain.com/auth/callback/` (apex **or** `https://www.your-custom-domain.com/auth/callback/` if you serve both — each origin must be listed; path must end with **`/`** to match Next **`trailingSlash`**.)

   This repo exchanges the PKCE `code` in [`src/app/auth/callback/route.ts`](src/app/auth/callback/route.ts). You can also keep `http://localhost:3000/` listed if you like.

**Custom domain (e.g. GoDaddy → Vercel):** At the registrar you only configure **DNS** (records Vercel shows when you add the domain to the Vercel project). There is **no** OAuth or Supabase setting inside GoDaddy itself. For production sign-in, add **`https://<your-domain>/auth/callback/`** to Supabase **Redirect URLs** as above, and ensure **Vercel → Environment Variables** includes the same **`NEXT_PUBLIC_SUPABASE_URL`** / keys for **Production** as you expect.

**Tip:** Do **not** point `NEXT_PUBLIC_SITE_URL` at production while testing on localhost — OAuth uses the live browser origin for `redirectTo` so local sign-in stays on local.

On **phones**, test sign-in in **Safari or Chrome**, not inside Instagram/TikTok/Facebook in-app browsers — those WebViews often break OAuth, cookies, or redirects.

After step 4, retry **Continue with Google** on `/login`.

### Google sign-in (`401` / `deleted_client`)

Google returns **`deleted_client`** when the **Client ID** in Supabase no longer matches a valid **OAuth 2.0 Client ID** in Google Cloud (the credential was deleted, the GCP project was removed, or Supabase still has an old ID after you recreated credentials).

1. **Google Cloud Console** (same Google account / org that owns the app) → **APIs & Services** → **Credentials**.
2. Under **OAuth 2.0 Client IDs**, confirm the Web client you use for Supabase still exists. If it is missing, click **Create credentials** → **OAuth client ID** → type **Web application**.
3. **Authorized redirect URIs** must include exactly: `https://<YOUR_SUPABASE_PROJECT_REF>.supabase.co/auth/v1/callback` (not your Vercel URL — that goes in Supabase **Redirect URLs** only).
4. **Supabase** → **Authentication** → **Providers** → **Google** → paste the **new** Client ID and Client Secret → **Save**.

**If you only “got a new secret”:** A **rotated secret** on the *same* OAuth client keeps the same **Client ID**. If you **deleted** the old OAuth client and **created a new** Web client, you get a **new Client ID and a new secret** — you must paste **both** into Supabase. Leaving the old **Client ID** (from the deleted client) while updating only the secret still produces **`deleted_client`**. The **Client ID** and **Client Secret** in Supabase must always be the pair shown together on that credential’s detail page in Google Cloud.

### Google sign-in (`400` / `redirect_uri_mismatch`)

This is **only** about **Google Cloud → your OAuth Web client → Authorized redirect URIs**. It is **not** about Supabase “Redirect URLs” and **not** about `http://localhost:3000/...` for this app’s Supabase flow.

When you sign in from **localhost or production**, Google is still sent to **Supabase’s** callback, not your app first. That URI must match **character-for-character** one row in **Authorized redirect URIs**:

1. In **Supabase** → **Settings** → **API**, copy **Project URL** (e.g. `https://abcdefghijk.supabase.co`).
2. Your Google redirect URI is exactly: `https://abcdefghijk.supabase.co/auth/v1/callback` — use **your** host, **no** trailing slash, **https** only.
3. In **Google Cloud** → **Credentials** → open the **same** Web client whose **Client ID** you pasted into **Supabase → Providers → Google** → under **Authorized redirect URIs**, add that exact line (and **Save** in Google).
4. If you use **more than one Supabase project** (e.g. dev vs prod keys in different `.env` files), each project has a **different** `*.supabase.co` host — add **each** `https://<ref>.supabase.co/auth/v1/callback` to that OAuth client, or use separate Google OAuth clients per Supabase project and matching IDs/secrets in each Supabase project.

`redirect_uri_mismatch` on localhost with **`deleted_client`** elsewhere usually means **two different OAuth clients or two Supabase refs** are mixed (e.g. `.env.local` points at project A but Google only lists project B’s callback, while production still references a deleted client).

### Supabase SSR (`@supabase/ssr`)

Auth uses **cookie-backed sessions**: [`middleware.ts`](middleware.ts) calls `createServerClient` + `getUser()` so tokens refresh on navigation. The browser uses `createBrowserClient` from [`src/utils/supabase/client.ts`](src/utils/supabase/client.ts) (via [`AuthContext`](src/context/AuthContext.tsx) and [`src/lib/db/supabase.ts`](src/lib/db/supabase.ts)). For Server Components / Route Handlers that need the session, use [`src/utils/supabase/server.ts`](src/utils/supabase/server.ts).

Existing **`/api/*` routes** that instantiate `@supabase/supabase-js` with the anon key remain **separate** (no cookies unless you refactor them).

## 2. Supabase database

### 2.1 Run the migration (once per project)

In the Supabase SQL editor, run the migration file:

[supabase/migrations/20260202120000_trails_rls_verified_saved.sql](supabase/migrations/20260202120000_trails_rls_verified_saved.sql)

It:

- Adds `is_verified` on `public.trails` (for “Verified” badges in Trail Explorer).
- Ensures **RLS** on `trails` with **public `SELECT`** for `anon` and `authenticated`.
- Creates **`user_saved_trails`** (`user_id`, `trail_id`) with RLS so each user only reads/writes their own rows.

Requires an existing `public.trails` table with a text `id` primary key (as used by the seed script). If your table is still empty, that is fine.

### 2.2 Seed trail rows

From the repo root (Node 20.6+ recommended for `--env-file`):

```bash
npm run seed:trails
```

This runs [scripts/upsert-trails.mjs](scripts/upsert-trails.mjs) against [src/data/trails.json](src/data/trails.json). The script tries several column layouts (`photo_url` vs `image_url`, `name` vs `title`, etc.) so it matches common schemas. Prefer the **service role** key for inserts; the anon key only works if you have added permissive insert policies (not included by default).

### 2.3 Admin panel + post moderation columns

- **Owner/Admin UI:** [`/admin`](src/app/admin/page.tsx) — visible only if your row in `public.users` has `role` = `owner` or `admin` (set your user in Supabase Table Editor to `owner` for first access). Tabs: overview stats, **verify clubs**, **delete/hide posts**, **search users** (owner can set `user` / `admin` roles).
- **APIs** use the **service role** on the server after verifying your JWT; add `SUPABASE_SERVICE_ROLE_KEY` to Vercel.
- **SQL:** run [supabase/migrations/20260203140000_posts_moderation.sql](supabase/migrations/20260203140000_posts_moderation.sql) to add `hidden` and `moderation_status` on `posts` (feeds hide `hidden = true` posts).
- **Home** still has the small **Moderation** queue (3+ flags) + link to the full admin panel.

### 2.4 Runs: club vs community listings

- **SQL:** apply [supabase/migrations/20260204120000_runs_workflow.sql](supabase/migrations/20260204120000_runs_workflow.sql) so `runs` has `run_source` (`club_official` | `user_submitted`), optional `host_id`, and `user_acknowledged_disclaimer_at` for community runs.
- **Club run:** leader/admin/owner of a **verified** club posts an official listing → stored as `club_official`, published immediately (no admin approval queue).
- **Community run:** any signed-in user → `user_submitted`; host must accept an in-app disclaimer; detail pages show extra legal/safety copy.
- **UI:** [`/runs`](src/app/runs/page.tsx) “Host a Run” drawer and [`/runs/create`](src/app/runs/create/page.tsx) use the same [`HostRunWizard`](src/components/runs/HostRunWizard.tsx) with trail search and mobile-friendly controls.

## 3. Trail Explorer (live data)

- [src/app/trails/page.tsx](src/app/trails/page.tsx) loads trails from Supabase only (no static JSON fallback).
- [src/lib/trails/mapDbTrail.ts](src/lib/trails/mapDbTrail.ts) maps rows to UI fields, including **Easy / Moderate / Hard** labels and `is_verified`.
- **Offline MVP:** last successful list is cached in `localStorage` for up to 7 days; when the device is offline, that cache is shown if the network request fails.

## 4. SOS

- **Global SOS:** red floating button (all screens) — [src/components/GlobalSOS.tsx](src/components/GlobalSOS.tsx). Uses GPS, then **Open Maps**, **Share**, and **Copy text** with a pre-written emergency message.
- **Run SOS:** unchanged on [src/app/runs/[runId]/page.tsx](src/app/runs/[runId]/page.tsx) — broadcasts to participants via `sos_alerts`.

## 5. PWA and Capacitor

- **PWA:** [next.config.ts](next.config.ts) uses `next-pwa` (disabled in development).
- **Capacitor:** [capacitor.config.ts](capacitor.config.ts) uses `webDir: 'public'` and loads the app from **`server.url`** (default `http://localhost:3000` for `npx cap run ios` / `android` while Next dev is running).

For a **production** native build pointed at Vercel:

```bash
set CAPACITOR_SERVER_URL=https://YOUR_DEPLOYMENT.vercel.app/
npx cap sync
```

(On PowerShell: `$env:CAPACITOR_SERVER_URL='https://...'; npx cap sync`.)

Then open the native project in Xcode / Android Studio. The WebView loads your hosted Next app; you do not need a separate static `out` export unless you choose that workflow later.

`npm run cap:sync` runs `npx cap sync`.

### Physical phone over Wi‑Fi (quick test)

1. **Same network:** Phone and PC on the same Wi‑Fi (or USB tether — PC may get a `172.*` address).

2. **Listen on all interfaces:** from the repo root run **`npm run dev:lan`** (same as `next dev --hostname 0.0.0.0 --port 3000`). Next may print **Network: `http://0.0.0.0:3000`** — that only means “listening everywhere”; **do not open `0.0.0.0` on your phone.** Use your real LAN IP instead (Windows: `ipconfig` → **IPv4 Address**, often `192.168.*.*`).

3. **Firewall:** Allow inbound TCP **3000** on Windows if the phone cannot load the site.

4. **Browser on phone:** Open **`http://YOUR_PC_IP:3000/`** (HTTP is fine for dev).

5. **Google sign-in from the phone:** In Supabase **Authentication → URL Configuration → Redirect URLs**, add **`http://YOUR_PC_IP:3000/auth/callback/`** (same path your app uses; trailing slash matches your Next **`trailingSlash`** setting).

**Capacitor Android pointing at your PC:** set your LAN URL then sync so the WebView loads dev instead of localhost (localhost inside the phone is the phone itself):

```powershell
$env:CAPACITOR_SERVER_URL='http://YOUR_PC_IP:3000/'
npm run cap:sync
```

Then open the Android project in Android Studio and run on the device. Change **`YOUR_PC_IP`** whenever DHCP assigns a new address.

**Easiest HTTPS path:** deploy a **Vercel preview** URL and set **`CAPACITOR_SERVER_URL`** to that URL — fewer firewall/OAuth redirect quirks.

## 6. Saved trails (community)

Saving a trail from the list or detail page requires:

1. Signed-in user (Supabase Auth).
2. Migration applied so `user_saved_trails` exists with RLS.

If the table is missing, the UI shows a toast with the Supabase error message.

## 7. Gemini / other notes

Paste any extra context from Gemini (alternate schemas, one-off SQL, Vercel project IDs) **below this line** so future sessions can reconcile it with this file.

---

_Add your Gemini transcript or bullet notes here._
