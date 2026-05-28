#!/usr/bin/env node
// Apply pending Supabase changes to the linked cloud project.
//
// Usage:
//   npm run update
//
// What it does (in order):
//   1. Push any new SQL migrations          (supabase db push)
//   2. Redeploy the admin-ops edge function (supabase functions deploy)
//   3. Regenerate src/types/db.ts           (supabase gen types)
//
// Frontend code does NOT need a manual deploy step - Cloudflare Pages
// rebuilds + redeploys automatically on `git push` to main.
//
// Run this BEFORE you push code that depends on new schema or function
// changes, so prod is ready when the new frontend goes live.
//
// Re-runnable: db push and fn deploy are idempotent (no-op if nothing
// changed). Types regen always overwrites src/types/db.ts.

import { createInterface } from "node:readline/promises";
import { stdin, stdout, env, exit } from "node:process";
import { existsSync, readFileSync, writeFileSync, chmodSync } from "node:fs";
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

// ---- Pre-flight ----
if (!existsSync("supabase/.temp/project-ref")) {
  die(
    "Project not linked yet. Run `npm run setup` first (or `npm run sb:link -- --project-ref <ref>`)."
  );
}
const projectRef = readFileSync("supabase/.temp/project-ref", "utf8").trim();

// Load cached credentials from .env.cli (written by `npm run setup`, gitignored)
const cliEnv = existsSync(".env.cli")
  ? Object.fromEntries(
      readFileSync(".env.cli", "utf8")
        .split("\n")
        .map((l) => l.match(/^([A-Z_]+)=(.*)$/))
        .filter(Boolean)
        .map(([, k, v]) => [k, v.replace(/^['"]|['"]$/g, "").trim()])
    )
  : {};

let accessToken = env.SUPABASE_ACCESS_TOKEN || cliEnv.SUPABASE_ACCESS_TOKEN;
let dbPassword = env.SUPABASE_DB_PASSWORD || cliEnv.SUPABASE_DB_PASSWORD;

let prompted = false;
if (!accessToken || !dbPassword) {
  console.log("No cached credentials in .env.cli - asking once.");
  const rl = createInterface({ input: stdin, output: stdout });
  if (!accessToken) {
    accessToken = (
      await rl.question("Personal access token (sbp_...): ")
    ).trim();
    prompted = true;
  }
  if (!dbPassword) {
    dbPassword = (await rl.question("Database password: ")).trim();
    prompted = true;
  }
  rl.close();
}
if (!accessToken.startsWith("sbp_")) die("Token should start with sbp_");
if (!dbPassword) die("DB password required");

if (prompted) {
  const body =
    `# Auto-generated. Gitignored. Delete to revoke local access.\n` +
    `SUPABASE_ACCESS_TOKEN=${accessToken}\n` +
    `SUPABASE_DB_PASSWORD=${dbPassword}\n`;
  writeFileSync(".env.cli", body);
  try {
    chmodSync(".env.cli", 0o600);
  } catch {
    // best-effort
  }
  log("Cached credentials -> .env.cli (gitignored). Future runs won't ask.");
}

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
log(`Updating project ${projectRef}...`);
console.log();

log("1/3 Pushing database migrations...");
run("npm run db:push");

console.log();
log("2/3 Deploying admin-ops edge function...");
run("npm run fn:deploy");

console.log();
log("3/3 Regenerating TypeScript types...");
run("npm run db:types");

console.log();
console.log(c.green("Update complete."));
console.log();
console.log("Next:");
console.log("  " + c.green("git push") + "   # Cloudflare Pages will rebuild the frontend");
console.log();
console.log(c.dim("Tip: type `clear` (or Cmd+K) to wipe the pasted token from terminal scrollback."));
