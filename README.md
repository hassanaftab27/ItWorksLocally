# ItWorksLocally

Lightweight Jira clone for small teams (~20 users). Channels with kanban + list views, magic-link auth, admin-managed users. Everything on free tiers.

**Stack:** React + Vite + TypeScript | Supabase Postgres + Auth + Edge Functions | Cloudflare Pages.
**Columns:** Work! | Working | Working? | Works Locally | Works Everywhere.


## Features

- **Channels** - create project channels, each with a Board (kanban) and List view
- **Five fixed columns** - Work! / Working / Working? / Works Locally / Works Everywhere
- **Drag to reorder** - drag tickets within a column; order is stored and synced
- **Tickets** - title, description, type (task/bug), priority (Low/Medium/High/Critical), category, progress slider, due date with time, multi-assignee
- **My Tasks** - personal dashboard showing all tickets assigned to you, grouped by column, filterable
- **Per-column filter** - show/hide columns in list and My Tasks views
- **Magic-link auth** - no passwords; admin-invite only (signups disabled)
- **Roles** - Admin (full access) and Member (channel-scoped write, read everywhere)
- **Admin: user management** - invite users via Supabase Edge Function, change name/role, delete
- **Admin: categories** - create global categories with 16 color presets, assign to any ticket
- **Admin: organization logo** - upload a company logo via Supabase Storage; never stored in git
- **Avatar badges** - initials badge per user with 16 color presets (light + dark variants)
- **Light / dark theme** - toggle with preference saved to localStorage
- **Responsive layout** - sidebar collapses on mobile; columns and labels adapt to screen size
- **RLS-enforced permissions** - all authorization enforced in Postgres; client-side gating is cosmetic only
- **History on tickets** - created by, last edited by, last moved by (with timestamps)
- **Soft deletes** - removing a user from a channel drops their assignments but keeps their history; deleting a user shows "Deleted User" everywhere
- **Zero global installs** - Supabase CLI runs project-scoped; no Docker, no global tools


## Setup - 5 steps, ~5 minutes

Prerequisites: Node.js 18+. A free Supabase account. (No global installs, no Docker.)

### 1. Create your Supabase project

1. <https://supabase.com/dashboard> -> **New Project**
2. **Generate a password** and save it in your password manager
3. Wait ~2 min for it to provision

Then, from the dashboard, grab **four values** (you'll paste them once into the setup script):
- **Project URL** - Project Settings -> API
- **publishable key** (`sb_publishable_...`) - Project Settings -> API keys
- **secret key** (`sb_secret_...`) - same page, click *Reveal*
- **Personal access token** (`sbp_...`) - <https://supabase.com/dashboard/account/tokens> -> Generate new

> *If your project shows "Legacy" `anon` / `service_role` keys instead of publishable/secret, those work too - `anon` = publishable, `service_role` = secret.*

### 2. Install + configure env

```bash
git clone <your-fork-or-this-repo>
cd ItWorksLocally
npm install
cp .env.example .env.local
```

Edit `.env.local`:
```
VITE_SUPABASE_URL=https://<your-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
```

### 3. Run the setup script

```bash
npm run setup
```

It asks 5 questions (paste each):

1. Personal access token (`sbp_...`)
2. Database password
3. Secret key (`sb_secret_...`)
4. Admin email *(you'll log in with this)*
5. Admin full name *(optional)*

Then it does everything else for you:

- Links the Supabase CLI to your project
- Pushes the database schema (`supabase/migrations/0001_init.sql`)
- Deploys the `admin-ops` edge function
- Configures Supabase Auth (Site URL = `localhost:5173`, signups disabled - admin-invite only)
- Creates your admin auth user + `profiles` row

Re-running is safe (the script handles "user already exists" and uses upserts).

> When done, run `clear` (or **Cmd+K**) to wipe the pasted secrets from your terminal scrollback.

### 4. Start the app

```bash
npm run dev
```

### 5. Log in

Open <http://localhost:5173/>, enter your admin email, click the magic link in your inbox (check spam on the first email from a new Supabase project). You should see the **admin** badge top-right.


## Deploy to Cloudflare Pages

### A. Push to GitHub

```bash
git remote add origin git@github.com:<your-github-username>/<your-repo-name>.git
git push -u origin main
```

### B. Connect Cloudflare Pages

1. <https://dash.cloudflare.com> -> Workers & Pages -> Create application -> Pages -> **Connect to Git**
2. Pick your repo
3. Build settings:
   - **Framework preset:** Vite
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
4. **Environment variables** (set on Production **and** Preview):
   - `VITE_SUPABASE_URL` - your Project URL
   - `VITE_SUPABASE_PUBLISHABLE_KEY` - your publishable key
5. Save -> first deploy starts. ~2 min later you get a `https://<name>.pages.dev` URL.

### C. Tell Supabase about your prod URL

```bash
npm run setup:add-url -- https://<name>.pages.dev
```

This adds the prod URL to Supabase Auth's allow list and sets it as the new Site URL. Localhost stays in the allow list so dev still works. Magic links now redirect correctly from both.

From here on, every `git push` to `main` auto-deploys.


## Updating - pushing schema or function changes

When you change SQL migrations (`supabase/migrations/*.sql`) or the edge function (`supabase/functions/admin-ops/index.ts`), run:

```bash
npm run update
```

First run prompts for your personal access token + DB password and caches them to `.env.cli` (gitignored, chmod 600). Every run after that is silent. Then:

1. Pushes any pending DB migrations (`db:push`)
2. Redeploys the `admin-ops` edge function (`fn:deploy`)
3. Regenerates `src/types/db.ts` from the new schema

Then `git push` - Cloudflare Pages rebuilds the frontend automatically.

> Run `npm run update` **before** `git push` if your frontend code depends on new schema. Otherwise the prod build will hit the old DB.

**Adding a new migration:**

```bash
npm run db:migrate:new add_my_change   # creates supabase/migrations/<timestamp>_add_my_change.sql
# edit the file with your SQL
npm run update                         # applies it + regenerates types
```


## Local vs production - at a glance

| | Local dev | Production |
|---|---|---|
| App URL | `http://localhost:5173` | `https://your-app.pages.dev` |
| Supabase project | Same (one shared backend) | Same |
| `VITE_*` env vars | `.env.local` (gitignored) | Cloudflare Pages -> Settings -> Env vars |
| Magic-link redirect | localhost (in Supabase allow list) | pages.dev (in Supabase allow list, set as Site URL) |
| Database / users / channels | Same data | Same data |

Local and prod share **one Supabase backend**. That's normal for a 20-person team. Want a separate staging? Create a second Supabase project, point a separate Cloudflare environment at it.


## Day-to-day commands

```bash
npm run dev               # local dev server (localhost:5173)
npm run build             # production build -> dist/
npm run typecheck

npm run db:migrate:new <name>   # new SQL migration file
npm run db:push                 # apply migrations to cloud
npm run db:types                # regenerate TS types from cloud schema
npm run fn:deploy               # redeploy admin-ops function

npm run setup                   # initial setup (re-runnable; idempotent)
npm run setup:add-url -- <url>  # add another redirect URL (e.g. prod)
npm run update                  # apply migrations + redeploy function + regen types
```

All Supabase CLI calls are sandboxed (`HOME=$PWD/.supabase-home`), so the CLI never writes to your real `~/`.


## Permissions

| Action | Who |
|---|---|
| View any channel or ticket | Any signed-in user |
| Create/edit tickets | Channel members (admins are members everywhere by default) |
| Delete tickets | Admins only |
| Drag tickets between columns | Channel members + admins |
| Create/edit/delete channels | Admins only |
| Invite/remove channel members | Admins only |
| Invite/delete users | Admins only |

Removing a user from a channel drops their **active assignments** but keeps their **history** (their name still appears in "created by" / "last edited by" / "last moved by"). Deleting a user replaces all their references everywhere with **"Deleted User"**.


## Secrets - where each value lives

| Value | Lives in | In the repo? |
|---|---|---|
| Project URL, publishable key | `.env.local` + Cloudflare env var | No (publishable key is browser-safe anyway - RLS protects data) |
| Secret key | Auto-injected into Edge Functions by Supabase | **Never** |
| Database password | Your password manager | **Never** |
| Personal access token, DB password | `.env.cli` (gitignored, chmod 600), written by `npm run setup` / first `npm run update` | **Never** |

The repo can be public - nothing leaks.


## Want to see what the setup script does manually?

See [MANUAL_SETUP.md](MANUAL_SETUP.md) - covers every step done by `npm run setup` as separate dashboard clicks / CLI commands / curl calls. Useful if something fails or you just want to understand the moving parts.


## Troubleshooting

- **"Cannot connect to Docker"** during `fn:deploy` - your `package.json` is on the old Supabase CLI v1. It should be `"supabase": "^2.101.0"`. Re-run `npm install`.
- **Magic link redirects to `localhost:3000`** - Site URL wasn't updated. Re-run `npm run setup` (idempotent) or fix manually: Supabase Dashboard -> Auth -> URL Configuration.
- **Magic-link emails not arriving** - check spam folder; Supabase's free SMTP gets filtered on first sends from a new project.
- **`Invalid JWT`** - `.env.local` keys don't match the Supabase project. Re-check both values.


## Cost

Cloudflare Pages free + Supabase free + GitHub free = **$0/month** for 20 users. Free tier has 5-10x headroom.
