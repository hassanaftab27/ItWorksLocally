# Manual setup

This is what `npm run setup` does, broken into individual commands. Use it if:

- the script fails on one step and you want to retry just that step
- you prefer dashboard clicks to terminal commands
- you want to understand exactly what's happening

Every step lists multiple methods (dashboard / CLI / curl) where possible. Pick whichever fits.


## Step 0 - Prerequisites

- Node.js 18+ (gives you `npm` and `npx`)
- A Supabase account (free)
- A Cloudflare account (free, only when you deploy)

Then in this folder:

```bash
npm install
cp .env.example .env.local
# edit .env.local with VITE_SUPABASE_URL + VITE_SUPABASE_PUBLISHABLE_KEY
```


## Step 1 - Authenticate the Supabase CLI

You need to prove your identity to the CLI exactly once.

### Method A - Browser login (interactive, best for your laptop)

```bash
npm run sb:login
```

Opens a browser -> click *Authorize* -> terminal completes. The access token is saved to `.supabase-home/.supabase/access-token` (project-local, gitignored). Subsequent `npm run` commands reuse it.

### Method B - Personal access token (non-interactive, for scripts/CI)

1. Generate one at <https://supabase.com/dashboard/account/tokens>
2. Either:
   - `export SUPABASE_ACCESS_TOKEN=sbp_...` for the whole shell session
   - or prepend it inline: `SUPABASE_ACCESS_TOKEN=sbp_... npm run db:push`

`npm run setup` uses Method B internally (no browser interaction needed).


## Step 2 - Link this folder to your cloud project

```bash
npm run sb:link -- --project-ref <your-ref>
```

`<your-ref>` is the slug from your Project URL: `https://<ref>.supabase.co`.

Press Enter at the database-password prompt (you'll need it for `db:push` next, not here).

This writes `supabase/.temp/project-ref` (project-local, gitignored).


## Step 3 - Push the database schema

### CLI (default)

```bash
npm run db:push
```

It prompts for the database password (from when you created the project). To skip the prompt:

```bash
SUPABASE_DB_PASSWORD='your-pwd' npm run db:push
```

### Dashboard alternative

If you'd rather not use the CLI for migrations: Supabase Dashboard -> **SQL Editor -> New query** -> paste the contents of `supabase/migrations/0001_init.sql` -> **Run**. Same outcome.


## Step 4 - Deploy the Edge Function

```bash
npm run fn:deploy
```

Bundles + uploads `supabase/functions/admin-ops/index.ts` to your project.

The function reads `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` (or `SUPABASE_ANON_KEY`), and `SUPABASE_SECRET_KEY` (or `SUPABASE_SERVICE_ROLE_KEY`) - **all three are auto-injected by Supabase**. You don't need to `supabase secrets set` anything; the `SUPABASE_` prefix is reserved.

**There's no dashboard alternative for edge functions** - the CLI is required.


## Step 5 - Configure Supabase Auth

You need to: set the site URL, allow `localhost:5173` as a redirect target, and disable open signups (admin-invite only).

### Method A - Dashboard clicks

1. **Authentication -> URL Configuration**
   - Site URL: `http://localhost:5173`
   - Redirect URLs: add `http://localhost:5173`, `http://localhost:5173/*`
   - Save
2. **Authentication -> Providers -> Email** -> toggle **Enable Email Signups** to **OFF**

### Method B - Management API curl (one shot)

```bash
curl -X PATCH "https://api.supabase.com/v1/projects/<your-ref>/config/auth" \
  -H "Authorization: Bearer <sbp_personal_access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "site_url": "http://localhost:5173",
    "uri_allow_list": "http://localhost:5173,http://localhost:5173/*",
    "disable_signup": true
  }'
```

This is exactly what `npm run setup` does internally.


## Step 6 - Bootstrap the first admin

The app is admin-invite only - no public signup. So the very first admin must be planted manually. Three options:

### Method A - Dashboard

1. **Authentication -> Users -> Add user -> Create new user**
   - Email: your email
   - Tick the **Auto Confirm User** box
   - Click **Create user**, copy the **User UID**
2. **Table Editor -> profiles -> Insert -> Insert row**:
   - `id` = paste the UID
   - `email` = your email
   - `full_name` = your name
   - `role` = `admin`

### Method B - Dashboard SQL editor

1. Create the auth user via the dashboard as in Method A (steps 1).
2. **SQL Editor -> New query**:
   ```sql
   insert into public.profiles (id, email, full_name, role)
   values ('<paste-uid>', 'you@example.com', 'Your Name', 'admin');
   ```

### Method C - curl (what `npm run setup` does)

```bash
SECRET=sb_secret_xxxx
URL=https://<your-ref>.supabase.co
EMAIL=you@example.com
NAME="Your Name"

# 1. Create the auth user (email pre-confirmed)
USER_ID=$(curl -s -X POST "$URL/auth/v1/admin/users" \
  -H "Authorization: Bearer $SECRET" -H "apikey: $SECRET" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"email_confirm\":true,\"user_metadata\":{\"full_name\":\"$NAME\"}}" \
  | node -e "process.stdin.on('data', d => console.log(JSON.parse(d).id))")

echo "Created user $USER_ID"

# 2. Insert the profile row
curl -X POST "$URL/rest/v1/profiles" \
  -H "Authorization: Bearer $SECRET" -H "apikey: $SECRET" \
  -H "Content-Type: application/json" \
  -d "{\"id\":\"$USER_ID\",\"email\":\"$EMAIL\",\"full_name\":\"$NAME\",\"role\":\"admin\"}"
```

`SECRET` is the `sb_secret_...` key - **never commit it**. After running this once, you can rotate the key in Project Settings -> API keys if it ended up somewhere logged.


## Step 7 - Run the app

```bash
npm run dev
```

Open <http://localhost:5173>, enter your admin email, click the magic link, you're in.


## After deploying to Cloudflare Pages

Once you have a `https://<name>.pages.dev` URL, you need to add it to Supabase's auth allow list. Same three methods as Step 5:

### Method A - `npm run setup:add-url`

```bash
npm run setup:add-url -- https://<name>.pages.dev
```

This is the easiest. It reads the current Supabase auth config, merges the new URL into the allow list (keeping localhost), and sets the new URL as the default Site URL.

### Method B - Dashboard

Supabase Dashboard -> **Authentication -> URL Configuration**:
- Site URL: `https://<name>.pages.dev`
- Redirect URLs allow list - add: `https://<name>.pages.dev`, `https://<name>.pages.dev/*`
- Keep `http://localhost:5173` entries so dev still works
- Save

### Method C - curl

```bash
curl -X PATCH "https://api.supabase.com/v1/projects/<your-ref>/config/auth" \
  -H "Authorization: Bearer <sbp_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "site_url": "https://<name>.pages.dev",
    "uri_allow_list": "https://<name>.pages.dev,https://<name>.pages.dev/*,http://localhost:5173,http://localhost:5173/*"
  }'
```


## Cleaning up

Full uninstall, leaves no trace on your system:

```bash
rm -rf node_modules .supabase-home supabase/.temp dist .env.local
```

If you ever had the Supabase CLI globally installed before this project, you can also remove its state:

```bash
rm -rf ~/.supabase
```

This project never writes there - it sandboxes the CLI's HOME to `.supabase-home/` inside the project folder via the `package.json` scripts.
