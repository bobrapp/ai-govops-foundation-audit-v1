// Agent chat — streams persona-voiced replies via Lovable AI Gateway.
// Modes:
//   - intake  : Ken or Bob runs a structured intake to qualify a Review.
//               Open to any signed-in user. Caps at 24 turns/thread.
//   - 1on1    : single persona answers the user. Admin/curator/reviewer only.
//   - council : Ken "The Chief" routes the next persona, then that persona answers.
//               Admin/curator/reviewer only.
//
// Persists user message + agent reply (+ optional handoff marker) to agent_messages.
// On qualification, marks the thread `intake_qualified_at` and returns
// { qualified: true, scope } so the client can create a draft Review.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-2.5-flash";
const INTAKE_TURN_CAP = 24;

interface Persona {
  id: string;
  slug: string;
  display_name: string;
  role_title: string;
  short_bio: string;
  skills: string[];
  guardrails: string[];
  is_chief: boolean;
}

interface MessageRow {
  role: "user" | "agent" | "system";
  content: string;
  persona_id: string | null;
}

const personaSystemPrompt = (p: Persona) =>
  `You are ${p.display_name}, the ${p.role_title} of the AIgovops Agent Council.

Persona summary: ${p.short_bio}

Your domain skills: ${p.skills.join(", ")}.
Your hard guardrails (NEVER violate): ${p.guardrails.join(", ")}.

Voice rules:
- Speak in first person, in character, but stay technically precise — you are an auditor.
- Keep replies under 180 words unless the user asks for depth.
- When you see something outside your domain, say so and recommend a handoff to the right council member.
- Cite AOS controls or framework refs (EU AI Act / NIST AI RMF / ISO 42001 / HIPAA / SOC 2) by id when relevant.
- Never invent audit results or sign anything — only Ken can sign.

You are part of a council; other members include cryptography (Turing), security (Kerckhoffs), risk (Nightingale), code/SBOM (Lovelace), systems (Hopper), compliance (Pacioli), ethics (Arendt), SRE (Hamilton), and Chief Auditor (Ken Newton).`;

const intakeSystemPrompt = (p: Persona) =>
  `You are ${p.display_name}, ${p.role_title} of the AIgovops Agent Council, running an INTAKE conversation with a prospective auditee.

Your job in intake is ONLY to qualify what audit they need. You do NOT perform the audit yet. You are warm, brief, and decisive.

Collect, in this order, the minimum needed to draft a Review:
  1. scenario — one of: enterprise_oss, healthcare_codegen, generative_ip, hr_behavior, general
  2. organization name
  3. scope_statement — 1–3 sentences naming the system, environment, and boundary
  4. evidence_available — short list of artifacts they can share (policy code, SBOM, model card, logs, configs, screenshots, runbooks)
  5. frameworks_in_scope — any of: EU_AI_Act, NIST_AI_RMF, ISO_42001, HIPAA, SOC2, GDPR, OTHER
  6. urgency — routine | quarter | urgent

Voice rules:
- Ask AT MOST 2 questions per turn. Never an interrogation.
- If the user gives partial info, summarise what you have, ask only what's missing.
- ${p.is_chief ? "As a Chief, you may also state independence requirements clearly." : ""}
- Keep replies under 140 words.

When you have ALL six items with reasonable confidence, end your reply with EXACTLY this line on its own (no markdown fences):
QUALIFIED::{"scenario":"<one>","organization":"<name>","scope_statement":"<text>","evidence_available":["<a>","<b>"],"frameworks_in_scope":["<f>"],"urgency":"<level>"}

Until you emit QUALIFIED, do not pretend the intake is done. If the user goes off-topic, gently steer back.`;

const routerSystemPrompt = (members: Persona[]) =>
  `You are Ken "The Chief" Newton, moderating an AIgovops council session.
Pick the SINGLE best council member to answer the user's latest message. Choose only from the active council:
${members.map((m) => `- ${m.slug} :: ${m.display_name} — ${m.role_title} (skills: ${m.skills.join(", ")})`).join("\n")}

Respond ONLY in this exact JSON shape, no prose, no markdown fences:
{"next_slug":"<slug-from-list>","reason":"<one short sentence>"}`;

const callGateway = async (
  apiKey: string,
  messages: Array<{ role: string; content: string }>,
) => {
  const resp = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: MODEL, messages, temperature: 0.4 }),
  });
  if (resp.status === 429) throw new Error("Rate limit hit, please retry shortly.");
  if (resp.status === 402) throw new Error("AI credits exhausted — top up Lovable AI in workspace.");
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Gateway ${resp.status}: ${text.slice(0, 300)}`);
  }
  const data = await resp.json();
  return (data.choices?.[0]?.message?.content ?? "").trim();
};

// Try to extract a QUALIFIED::{...} marker from a reply.
const extractQualified = (reply: string): { scope: Record<string, unknown>; cleaned: string } | null => {
  const m = reply.match(/QUALIFIED::(\{[\s\S]*?\})\s*$/);
  if (!m) return null;
  try {
    const scope = JSON.parse(m[1]);
    const cleaned = reply.slice(0, m.index).trim();
    return { scope, cleaned };
  } catch {
    return null;
  }
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { threadId, userMessage } = await req.json();
    if (!threadId || !userMessage) {
      return new Response(JSON.stringify({ error: "threadId and userMessage required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization") ?? "";

    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Roles
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", user.id);
    const roleSet = new Set((roles ?? []).map((r) => r.role));
    const isPrivileged = roleSet.has("admin") || roleSet.has("curator") || roleSet.has("reviewer");

    // Thread + ownership
    const { data: thread, error: tErr } = await admin
      .from("agent_threads").select("*").eq("id", threadId).maybeSingle();
    if (tErr || !thread) {
      return new Response(JSON.stringify({ error: "thread not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (thread.owner_id !== user.id && !roleSet.has("admin")) {
      return new Response(JSON.stringify({ error: "forbidden: not your thread" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mode gating
    const mode: "intake" | "1on1" | "council" = thread.kind ?? "1on1";
    if (mode !== "intake" && !isPrivileged) {
      return new Response(JSON.stringify({ error: "forbidden: 1on1/council require admin, curator, or reviewer" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Personas in this thread
    const personaIds: string[] = thread.persona_ids ?? [];
    if (!personaIds.length) {
      return new Response(JSON.stringify({ error: "thread has no personas" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (mode === "intake") {
      // Intake threads must only contain chiefs (Ken/Bob)
      const { data: pck } = await admin
        .from("agent_personas").select("is_chief").in("id", personaIds);
      if (!pck?.length || pck.some((p) => !p.is_chief)) {
        return new Response(JSON.stringify({ error: "intake threads may only include chief auditors" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const { data: personas } = await admin
      .from("agent_personas")
      .select("id, slug, display_name, role_title, short_bio, skills, guardrails, is_chief")
      .in("id", personaIds);
    const personaList = (personas ?? []) as Persona[];
    if (!personaList.length) throw new Error("personas not found");

    // History
    const { data: history } = await admin
      .from("agent_messages")
      .select("role, content, persona_id")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true })
      .limit(60);
    const past = (history ?? []) as MessageRow[];

    // Intake turn cap (count user messages already in thread)
    if (mode === "intake") {
      const userTurns = past.filter((m) => m.role === "user").length;
      if (userTurns >= INTAKE_TURN_CAP) {
        return new Response(JSON.stringify({
          error: `Intake turn cap reached (${INTAKE_TURN_CAP}). Start a new intake or sign in for full chat.`,
        }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // Persist user message
    await admin.from("agent_messages").insert({
      thread_id: threadId, role: "user", content: userMessage, persona_id: null,
    });

    let speakerSlug: string | null = null;
    let handoffReason: string | null = null;

    if (mode === "council" && personaList.length > 1) {
      const router = personaList.find((p) => p.is_chief) ?? personaList[0];
      const routerMsgs = [
        { role: "system", content: routerSystemPrompt(personaList) },
        ...past.map((m) => ({
          role: m.role === "user" ? "user" : "assistant",
          content: m.role === "agent"
            ? `[${personaList.find((p) => p.id === m.persona_id)?.slug ?? "agent"}] ${m.content}`
            : m.content,
        })),
        { role: "user", content: userMessage },
      ];
      const routeRaw = await callGateway(apiKey, routerMsgs);
      try {
        const parsed = JSON.parse(routeRaw.replace(/^```json|```$/g, "").trim());
        if (parsed?.next_slug && personaList.some((p) => p.slug === parsed.next_slug)) {
          speakerSlug = parsed.next_slug;
          handoffReason = parsed.reason ?? null;
        }
      } catch { /* fall through */ }
      if (!speakerSlug) speakerSlug = router.slug;

      const speaker = personaList.find((p) => p.slug === speakerSlug)!;
      await admin.from("agent_messages").insert({
        thread_id: threadId,
        role: "system",
        persona_id: router.id,
        handoff_to: speaker.id,
        content: handoffReason ?? `Routing to ${speaker.display_name}.`,
      });
    } else if (mode === "intake" && personaList.length > 1) {
      // For intake with both Ken+Bob, alternate: whoever spoke last yields, default Ken first
      const lastAgent = [...past].reverse().find((m) => m.role === "agent" && m.persona_id);
      const lastSlug = lastAgent ? personaList.find((p) => p.id === lastAgent.persona_id)?.slug : null;
      const ken = personaList.find((p) => p.slug === "ken-newton");
      const bob = personaList.find((p) => p.slug === "bob-smith");
      speakerSlug = lastSlug === "ken-newton" && bob ? bob.slug
                   : lastSlug === "bob-smith" && ken ? ken.slug
                   : (ken?.slug ?? personaList[0].slug);
    } else {
      speakerSlug = personaList[0].slug;
    }

    const speaker = personaList.find((p) => p.slug === speakerSlug)!;

    const systemPrompt = mode === "intake"
      ? intakeSystemPrompt(speaker)
      : personaSystemPrompt(speaker);

    const chatMsgs = [
      { role: "system", content: systemPrompt },
      ...past.map((m) => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.role === "agent"
          ? `[${personaList.find((p) => p.id === m.persona_id)?.display_name ?? "agent"}] ${m.content}`
          : m.content,
      })),
      { role: "user", content: userMessage },
    ];
    const rawReply = await callGateway(apiKey, chatMsgs);

    // Detect QUALIFIED marker on intake replies
    let qualifiedScope: Record<string, unknown> | null = null;
    let replyToStore = rawReply;
    if (mode === "intake") {
      const q = extractQualified(rawReply);
      if (q) {
        qualifiedScope = q.scope;
        replyToStore = q.cleaned ||
          `I have what we need. Drafting your Review now — you'll be moved to Quick Audit.`;
      }
    }

    await admin.from("agent_messages").insert({
      thread_id: threadId, role: "agent", persona_id: speaker.id, content: replyToStore,
    });

    const updatePayload: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (qualifiedScope) updatePayload.intake_qualified_at = new Date().toISOString();
    await admin.from("agent_threads").update(updatePayload).eq("id", threadId);

    return new Response(JSON.stringify({
      ok: true,
      mode,
      speaker: { id: speaker.id, slug: speaker.slug, display_name: speaker.display_name },
      handoffReason,
      reply: replyToStore,
      qualified: !!qualifiedScope,
      scope: qualifiedScope,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    console.error("agent-chat error", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
