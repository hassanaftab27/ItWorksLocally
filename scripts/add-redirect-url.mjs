#!/usr/bin/env node
// Add a production URL (e.g. https://your-app.pages.dev) to Supabase Auth.
//
// Usage:
//   npm run setup:add-url -- https://your-app.pages.dev
//
// Sets the prod URL as the new default Site URL and appends it to the
// redirect URL allow list, keeping any existing entries (so localhost
// still works for dev).

import { argv, env, exit, stdin, stdout } from "node:process";
import { createInterface } from "node:readline/promises";
import { readFileSync, existsSync } from "node:fs";

const newUrl = (argv[2] || "").replace(/\/$/, "");
if (!newUrl || !/^https?:\/\//.test(newUrl)) {
  console.error("Usage: npm run setup:add-url -- https://your-app.pages.dev");
  exit(1);
}

if (!existsSync(".env.local")) {
  console.error("No .env.local - run npm run setup first.");
  exit(1);
}
const envMap = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split("\n")
    .map((l) => l.match(/^([A-Z_]+)=(.*)$/))
    .filter(Boolean)
    .map(([, k, v]) => [k, v.replace(/^['"]|['"]$/g, "").trim()])
);
const projectRef = (envMap.VITE_SUPABASE_URL?.match(/https:\/\/([^.]+)\.supabase\.co/) || [])[1];
if (!projectRef) {
  console.error("Could not parse project ref from VITE_SUPABASE_URL in .env.local");
  exit(1);
}

let token = env.SUPABASE_ACCESS_TOKEN;
if (!token) {
  const rl = createInterface({ input: stdin, output: stdout });
  token = (await rl.question("Personal access token (sbp_...): ")).trim();
  rl.close();
}
if (!token.startsWith("sbp_")) {
  console.error("Token should start with sbp_");
  exit(1);
}

// Read current config so we don't clobber other entries
const getRes = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/config/auth`, {
  headers: { Authorization: `Bearer ${token}` },
});
if (!getRes.ok) {
  console.error(`Read auth config failed: ${getRes.status} ${await getRes.text()}`);
  exit(1);
}
const current = await getRes.json();
const existing = (current.uri_allow_list || "").split(",").map((s) => s.trim()).filter(Boolean);
const additions = [newUrl, `${newUrl}/*`];
const merged = Array.from(new Set([...existing, ...additions]));

const patchRes = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/config/auth`, {
  method: "PATCH",
  headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  body: JSON.stringify({
    site_url: newUrl,
    uri_allow_list: merged.join(","),
  }),
});
if (!patchRes.ok) {
  console.error(`Update failed: ${patchRes.status} ${await patchRes.text()}`);
  exit(1);
}

console.log("\x1b[32mSupabase Auth updated:\x1b[0m");
console.log(`  site_url      = ${newUrl}`);
console.log(`  redirect URLs = ${merged.join(", ")}`);
console.log();
console.log("Magic-link login will now redirect correctly from production and from localhost.");
