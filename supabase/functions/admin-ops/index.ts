// Supabase Edge Function: admin-ops
// Admin-only operations that need the secret (service-role) key.
//
// POST /admin-ops
//   { op: "create_user", email, full_name, role }   -> sends magic-link invite + creates profiles row
//   { op: "delete_user", user_id }                   -> deletes auth user (cascades to profiles + everywhere)
//
// Authn: caller's JWT is required. Authz: caller's profiles.role must be 'admin'.
//
// The URL, publishable, and secret keys are AUTO-INJECTED by Supabase into
// every Edge Function - you do NOT need to `supabase secrets set` them.
// Supabase injects them under the legacy names (SUPABASE_ANON_KEY,
// SUPABASE_SERVICE_ROLE_KEY) and, on newer projects, also under the new names
// (SUPABASE_PUBLISHABLE_KEY, SUPABASE_SECRET_KEY). We accept either.

import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_PUBLISHABLE_KEY =
  Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SECRET_KEY =
  Deno.env.get("SUPABASE_SECRET_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

type CreateUserBody = { op: "create_user"; email: string; full_name?: string; role: "admin" | "member" };
type DeleteUserBody = { op: "delete_user"; user_id: string };
type Body = CreateUserBody | DeleteUserBody;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return json({ error: "missing bearer token" }, 401);

  // Verify caller + check role using a publishable-key client bound to their JWT.
  const callerClient = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userData, error: userErr } = await callerClient.auth.getUser();
  if (userErr || !userData.user) return json({ error: "invalid token" }, 401);

  const { data: profile, error: profileErr } = await callerClient
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .single();

  if (profileErr || !profile) return json({ error: "no profile" }, 403);
  if (profile.role !== "admin") return json({ error: "admin only" }, 403);

  // Caller is admin - proceed with the secret-key client (bypasses RLS).
  const admin = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return json({ error: "invalid json body" }, 400);
  }

  if (body.op === "create_user") {
    if (!body.email || !body.role || !["admin", "member"].includes(body.role)) {
      return json({ error: "email and role are required" }, 400);
    }

    const { data: invite, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(body.email, {
      data: { full_name: body.full_name ?? null },
    });
    if (inviteErr || !invite.user) return json({ error: inviteErr?.message ?? "invite failed" }, 400);

    const { error: insErr } = await admin.from("profiles").insert({
      id: invite.user.id,
      email: body.email,
      full_name: body.full_name ?? null,
      role: body.role,
    });
    if (insErr) {
      // best-effort rollback so we don't leave an orphan auth user
      await admin.auth.admin.deleteUser(invite.user.id);
      return json({ error: insErr.message }, 400);
    }

    return json({ user_id: invite.user.id });
  }

  if (body.op === "delete_user") {
    if (!body.user_id) return json({ error: "user_id is required" }, 400);
    if (body.user_id === userData.user.id) return json({ error: "cannot delete yourself" }, 400);

    const { error: delErr } = await admin.auth.admin.deleteUser(body.user_id);
    if (delErr) return json({ error: delErr.message }, 400);

    return json({ ok: true });
  }

  return json({ error: "unknown op" }, 400);
});
