#!/usr/bin/env node
// One-shot setup for a fresh Supabase project + first admin user.
//
// Reads VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY from .env.local,
// asks for 5 values, then:
//   1. Links the Supabase CLI to the cloud project
//   2. Pushes the database schema (supabase/migrations/*)
//   3. Deploys the admin-ops edge function
//   4. Configures Auth (Site URL = localhost:5173, signups disabled)
//   5. Creates the auth user + inserts the admin profile row
//
// Safe to re-run: link/push/deploy are idempotent; user creation
// falls back to an existing user if the email is already registered.

import { createInterface } from "node:readline/promises";
import { stdin, stdout, env, exit } from "node:process";
import { readFileSync, writeFileSync, chmodSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";

const c = {
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
};
const log = (m) => console.log(`${c.green("==>")} ${m}`);
const warn = (m) => console.warn(`${c.yellow("!")}  ${m}`);
const die = (m) => {
  console.error(`${c.red("x")} ${m}`);
  exit(1);
};

// ---- 1. Read .env.local ----
if (!existsSync(".env.local")) {
  die(
    "No .env.local. Copy .env.example to .env.local and fill in VITE_SUPABASE_URL + VITE_SUPABASE_PUBLISHABLE_KEY first."
  );
}
const envMap = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split("\n")
    .map((l) => l.match(/^([A-Z_]+)=(.*)$/))
    .filter(Boolean)
    .map(([, k, v]) => [k, v.replace(/^['"]|['"]$/g, "").trim()])
);
const projectUrl = envMap.VITE_SUPABASE_URL;
const publishableKey = envMap.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!projectUrl) die("VITE_SUPABASE_URL missing in .env.local");
if (!publishableKey) die("VITE_SUPABASE_PUBLISHABLE_KEY missing in .env.local");
const projectRef = (projectUrl.match(/https:\/\/([^.]+)\.supabase\.co/) || [])[1];
if (!projectRef) die(`Could not parse project ref from ${projectUrl}`);

console.log();
log(`Project URL: ${projectUrl}`);
log(`Project ref: ${projectRef}`);
console.log();
console.log("I need 5 values from your Supabase dashboard.");
console.log(c.dim("None are saved to disk. Clear your terminal scrollback after for paranoia points."));
console.log();

// ---- 2. Prompts ----
const rl = createInterface({ input: stdin, output: stdout });
const ask = (q) => rl.question(q);

const accessToken =
  env.SUPABASE_ACCESS_TOKEN ||
  (await ask("  1) Personal access token  (supabase.com/dashboard/account/tokens, sbp_...): ")).trim();
const dbPassword =
  env.SUPABASE_DB_PASSWORD ||
  (await ask("  2) Database password      (from when you created the project): ")).trim();
const secretKey = (
  env.SUPABASE_SECRET_KEY || (await ask("  3) Secret key             (sb_secret_... from API keys page): "))
).trim();
const adminEmail = (await ask("  4) Admin email            (you will log in with this): ")).trim();
const adminName = (await ask("  5) Admin full name        (optional, Enter to skip): ")).trim();
rl.close();

if (!accessToken.startsWith("sbp_"))
  die("Personal access token should start with sbp_. Get one at https://supabase.com/dashboard/account/tokens");
if (!dbPassword) die("DB password required");
if (!secretKey.startsWith("sb_secret_") && !secretKey.startsWith("eyJ"))
  warn("Secret key looks unusual; continuing.");
if (!adminEmail.includes("@")) die("Admin email looks wrong");

// ---- 3. Run CLI steps (link, push, deploy) ----
const sbEnv = {
  ...env,
  SUPABASE_ACCESS_TOKEN: accessToken,
  SUPABASE_DB_PASSWORD: dbPassword,
};
const run = (cmd) => {
  try {
    execSync(cmd, { stdio: "inherit", env: sbEnv });
  } catch {
    die(`Command failed: ${cmd}`);
  }
};

console.log();
log("Linking CLI to project...");
run(`npm run sb:link -- --project-ref ${projectRef}`);

console.log();
log("Pushing database schema...");
run("npm run db:push");

console.log();
log("Deploying admin-ops edge function...");
run("npm run fn:deploy");

// ---- 4. Configure Auth via Management API ----
console.log();
log("Configuring Auth (Site URL = http://localhost:5173, signups disabled)...");
{
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/config/auth`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      site_url: "http://localhost:5173",
      uri_allow_list: "http://localhost:5173,http://localhost:5173/*",
      disable_signup: true,
    }),
  });
  if (!res.ok) die(`Auth config failed: ${res.status} ${await res.text()}`);
  log("  Auth configured");
}

// ---- 5. Bootstrap admin user ----
console.log();
log(`Bootstrapping admin user ${adminEmail}...`);
const adminHeaders = {
  Authorization: `Bearer ${secretKey}`,
  apikey: secretKey,
  "Content-Type": "application/json",
};

let userId;
{
  const res = await fetch(`${projectUrl}/auth/v1/admin/users`, {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify({
      email: adminEmail,
      email_confirm: true,
      user_metadata: adminName ? { full_name: adminName } : {},
    }),
  });
  if (res.ok) {
    const data = await res.json();
    userId = data.id;
    log(`  Auth user created (${userId})`);
  } else if (res.status === 422 || res.status === 400 || res.status === 409) {
    warn("  User already exists, looking up...");
    const lookup = await fetch(
      `${projectUrl}/auth/v1/admin/users?email=${encodeURIComponent(adminEmail)}`,
      { headers: { Authorization: `Bearer ${secretKey}`, apikey: secretKey } }
    );
    if (!lookup.ok) die(`Lookup failed: ${lookup.status} ${await lookup.text()}`);
    const data = await lookup.json();
    userId = data.users?.[0]?.id;
    if (!userId) die(`Could not find user with email ${adminEmail}`);
    log(`  Found existing user (${userId})`);
  } else {
    die(`Auth user create failed: ${res.status} ${await res.text()}`);
  }
}

// Upsert profile (Prefer: merge-duplicates makes this idempotent)
{
  const res = await fetch(`${projectUrl}/rest/v1/profiles`, {
    method: "POST",
    headers: { ...adminHeaders, Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify({
      id: userId,
      email: adminEmail,
      full_name: adminName || null,
      role: "admin",
    }),
  });
  if (!res.ok) die(`Profile insert failed: ${res.status} ${await res.text()}`);
  log("  Admin profile saved (role = admin)");
}

// ---- 6. Cache CLI credentials locally (gitignored) for `npm run update` ----
{
  const body =
    `# Auto-generated by 'npm run setup' so 'npm run update' doesn't re-prompt.\n` +
    `# Gitignored (matches .env.* in .gitignore). Delete this file to revoke local access.\n` +
    `SUPABASE_ACCESS_TOKEN=${accessToken}\n` +
    `SUPABASE_DB_PASSWORD=${dbPassword}\n`;
  writeFileSync(".env.cli", body);
  try {
    chmodSync(".env.cli", 0o600);
  } catch {
    // chmod is best-effort (no-op on non-POSIX FS)
  }
  log("  Cached CLI credentials -> .env.cli (gitignored, mode 600)");
}

console.log();
console.log(c.green("Setup complete!"));
console.log();
console.log("Next:");
console.log("  " + c.green("npm run dev"));
console.log(`  -> open http://localhost:5173, sign in with ${c.green(adminEmail)}`);
console.log();
console.log(c.dim("Tip: type `clear` (or Cmd+K) to wipe the pasted secrets from terminal scrollback."));
console.log(c.dim("Future `npm run update` runs will reuse .env.cli without asking."));
