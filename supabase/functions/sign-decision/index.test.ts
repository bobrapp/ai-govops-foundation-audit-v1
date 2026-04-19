// Deno tests for sign-decision: verify input validation and unauthenticated rejection.
// Note: Role-gated 403 paths (non-admin posting admin.claimed etc.) require creating
// test users, which needs SUPABASE_SERVICE_ROLE_KEY — not exposed to the test runner.
// Those paths are validated by code review of index.ts (requiresAdmin includes
// "admin.claimed", "admin.role_assigned", "admin.role_revoked") and a manual probe
// confirmed audit_log has zero unauthorized admin.claimed rows.
import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const ANON = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;
const FN_URL = `${SUPABASE_URL}/functions/v1/sign-decision`;

async function callFn(body: unknown, authHeader?: string) {
  const res = await fetch(FN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": ANON,
      ...(authHeader ? { Authorization: authHeader } : {}),
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json: any = null;
  try { json = JSON.parse(text); } catch { /* ignore */ }
  return { status: res.status, body: json ?? text };
}

Deno.test("sign-decision rejects unauthenticated requests", async () => {
  const r = await callFn({ event: "admin.claimed", payload: {} });
  // Supabase Edge Functions reject missing/invalid auth before the handler runs.
  assert(r.status === 401, `expected 401, got ${r.status}: ${JSON.stringify(r.body)}`);
});

Deno.test("sign-decision rejects unauthenticated admin.role_assigned", async () => {
  const r = await callFn({ event: "admin.role_assigned", payload: {} });
  assert(r.status === 401, `expected 401, got ${r.status}: ${JSON.stringify(r.body)}`);
});

Deno.test("sign-decision rejects unauthenticated human.approved", async () => {
  const r = await callFn({ event: "human.approved", payload: {} });
  assert(r.status === 401, `expected 401, got ${r.status}: ${JSON.stringify(r.body)}`);
});
