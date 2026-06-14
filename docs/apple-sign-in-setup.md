# Apple Sign In — `.p8` key, Supabase secret, auto-rotation

Apple Sign In on iPhone/Android/web uses **OAuth** (same flow as Google). Supabase needs a **client secret JWT** signed with your **Sign in with Apple** `.p8` key.

| Item | Expires? |
|------|----------|
| `.p8` key file | **No** — keep it safe; revoke only if leaked |
| Secret JWT in Supabase | **Yes** — Apple max ~6 months; we rotate automatically |

## 1. Apple Developer (one-time)

1. **Identifiers → App IDs** → `com.socaloffroaders.app` → enable **Sign In with Apple**.
2. **Identifiers → Services IDs** → create (e.g. `com.socaloffroaders.signin`) → enable **Sign In with Apple** → configure:
   - **Domains**: `socaloffroaders.com` (and your Supabase project host if required)
   - **Return URLs**: `https://<PROJECT_REF>.supabase.co/auth/v1/callback`
3. **Keys** → **+** → **Sign in with Apple** → download **`AuthKey_XXXXXXXXXX.p8`** (only once).
   - Note **Key ID** (10 chars) and your **Team ID** (Membership details).

Never commit the `.p8` file. Store it in a password manager or secure folder.

## 2. Supabase Dashboard (first time)

**Authentication → Providers → Apple**

| Field | Value |
|-------|--------|
| Enable | On |
| Client IDs | Your **Services ID** (OAuth) — bundle ID is set via script/cron as additional |
| Secret Key | Generated JWT (see below) |

**Authentication → URL Configuration → Redirect URLs**

- `https://socaloffroaders.com/auth/callback/`

## 3. Generate secret locally (first paste)

Create `.env.local` (not committed):

```env
APPLE_TEAM_ID=AB12CD34EF
APPLE_KEY_ID=XXXXXXXXXX
APPLE_SERVICES_ID=com.socaloffroaders.signin
APPLE_BUNDLE_ID=com.socaloffroaders.app
APPLE_PRIVATE_KEY_PATH=C:/path/to/AuthKey_XXXXXXXXXX.p8

# For --sync only (Account → Access Tokens at supabase.com/dashboard/account/tokens)
SUPABASE_ACCESS_TOKEN=sbp_...
SUPABASE_PROJECT_REF=your-project-ref
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
```

Print JWT (copy into Supabase **Secret Key**):

```bash
npm run apple:generate-secret
```

Or push directly to Supabase (no manual paste):

```bash
npx supabase login   # once, if not already logged in via CLI
npm run apple:sync-apple-secret
```

On Windows, if you already ran `supabase login`, the sync script reads your CLI token from Credential Manager — you do **not** need `SUPABASE_ACCESS_TOKEN` in `.env.local`.

**Vercel env alternative** — paste PEM into one line:

```env
APPLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIGT...\n-----END PRIVATE KEY-----"
```

## 4. Auto-rotation on Vercel (stops 6-month expiry pain)

Add Apple vars to **Vercel → Project → Settings → Environment Variables → Production**:

| Variable | Notes |
|----------|--------|
| `APPLE_TEAM_ID` | `T2G3L3K9SX` (your team) |
| `APPLE_KEY_ID` | `2S8W552LQS` |
| `APPLE_SERVICES_ID` | `com.socaloffroaders.signin` |
| `APPLE_PRIVATE_KEY` | PEM on **one line** with `\n` between lines — see below |
| `APPLE_BUNDLE_ID` | `com.socaloffroaders.app` |
| `SUPABASE_ACCESS_TOKEN` | Personal access token (you already have this on Vercel) |
| `SUPABASE_PROJECT_REF` | `pvdqageridqjgxswcalm` |
| `CRON_SECRET` | Same as your other crons |

**Easy local prep** (writes a gitignored snippet; does not print the key in the terminal):

```bash
npm run apple:vercel-env
```

Open `.secrets/vercel-apple-env-snippet.txt`, copy `APPLE_PRIVATE_KEY` into Vercel, then **delete the snippet file**.

In the Vercel UI, paste `APPLE_PRIVATE_KEY` as a single line — keep the literal `\n` characters between PEM lines (do not paste real line breaks unless Vercel accepts multiline secrets in your plan).

Vercel cron **`/api/cron/apple-secret`** runs on the 1st of each month and PATCHes a fresh JWT into Supabase.

Manual trigger (after deploy):

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://socaloffroaders.com/api/cron/apple-secret
```

## 5. Verify

1. iPhone TestFlight → **Continue with Apple** → browser sheet opens (like Google).
2. Supabase **Authentication → Providers → Apple** still enabled after cron runs.
3. Login footer shows `Auth apple-oauth-browser-v2` when latest JS is loaded.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Google works, Apple instant fail | Services ID + secret missing in Supabase |
| `invalid_client` from Apple | Wrong Services ID in JWT `sub` or expired secret |
| Cron 503 | Apple or `SUPABASE_ACCESS_TOKEN` env missing on Vercel |
| Cron 502 | Regenerate Supabase access token; check project ref |
