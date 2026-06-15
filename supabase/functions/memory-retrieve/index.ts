// Supabase Edge Function: memory-retrieve
// =============================================================================
// Receives a user message + conversation ID from the frontend before each
// reply.  Returns the most relevant active memory_facts assembled into a
// compact memoryText string, bounded by a character budget.
//
// Phase 2: keyword-less retrieval — returns top facts by importance/recency.
// Phase 4+: keyword / vector hybrid search.
//
// Auth: service_role (bypasses RLS).  The frontend does NOT send API keys.
// Phase 1.1: optional Auth identity binding — when an Authorization: Bearer
// header is present, the function validates the token and only reads
// conversations belonging to the authenticated user.  Without a token,
// personal mode (user_id = NULL) is still allowed.
// =============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ---------------------------------------------------------------------------
// CORS headers
// ---------------------------------------------------------------------------

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey",
};

const JSON_HEADERS: Record<string, string> = {
  ...CORS_HEADERS,
  "Content-Type": "application/json; charset=utf-8",
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Maximum number of facts to fetch from the database. */
const MAX_FACTS = 10;

/** Hard cap on returned memoryText length (characters). */
const HARD_BUDGET_CAP = 4000;

/** Separator inserted between facts in the assembled memoryText. */
const FACT_SEPARATOR = "\n---\n";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RetrievePayload {
  conversationId: string;   // frontend generateId() — NOT a UUID
  userText: string;
  budget: number;           // character budget for memoryText
  sceneState?: Record<string, unknown>;
  storyMemory?: Record<string, unknown>;
  recentMessages?: Array<{ role: string; content: string }>;
  memoryMode?: string;
}

interface MemoryFact {
  id: string;
  content: string;
  type: string;
  importance: number;
  updated_at: string;
}

interface RetrieveResponse {
  memoryText: string;
  selectedChapterIds: never[];
  selectedFactIds: string[];
}

// ---------------------------------------------------------------------------
// Request handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request): Promise<Response> => {
  // --- CORS preflight ------------------------------------------------
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  // --- Only POST -----------------------------------------------------
  if (req.method !== "POST") {
    return jsonError(405, "Method not allowed");
  }

  // --- Parse JSON body -----------------------------------------------
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "Invalid JSON body");
  }
  if (!body || typeof body !== "object") {
    return jsonError(400, "Body must be a JSON object");
  }

  // --- Validate required fields --------------------------------------
  const conversationId = body.conversationId;
  if (typeof conversationId !== "string" || conversationId.length === 0) {
    return jsonError(400, "Missing or invalid field: conversationId");
  }
  if (conversationId.length > 200) {
    return jsonError(400, "conversationId too long (max 200)");
  }

  const userTextRaw = body.userText;
  if (typeof userTextRaw !== "string") {
    return jsonError(400, "Missing or invalid field: userText");
  }
  // Defend against extreme payloads — truncate early before any DB work.
  const userText = userTextRaw.length > 10000
    ? userTextRaw.slice(0, 10000)
    : userTextRaw;

  const budgetRaw = body.budget;
  if (typeof budgetRaw !== "number") {
    return jsonError(400, "Missing or invalid field: budget (must be a number)");
  }
  // Clamp to [1, HARD_BUDGET_CAP].
  const budget = Math.max(1, Math.min(budgetRaw, HARD_BUDGET_CAP));

  // Optional fields: type-check only
  if (body.sceneState !== undefined && typeof body.sceneState !== "object") {
    return jsonError(400, "Invalid field: sceneState (must be an object)");
  }
  if (body.storyMemory !== undefined && typeof body.storyMemory !== "object") {
    return jsonError(400, "Invalid field: storyMemory (must be an object)");
  }
  if (body.recentMessages !== undefined && !Array.isArray(body.recentMessages)) {
    return jsonError(400, "Invalid field: recentMessages (must be an array)");
  }

  // --- Env vars ------------------------------------------------------
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env var");
    return jsonError(500, "Server configuration error");
  }

  // --- Supabase client -----------------------------------------------
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  // --- Optional auth identity ----------------------------------------
  const authResult = await getOptionalAuthUserId(supabase, req);
  if (authResult instanceof Response) return authResult;
  const authUserId: string | null = authResult;

  try {
    const payload: RetrievePayload = {
      conversationId,
      userText,
      budget,
      sceneState: (body.sceneState as Record<string, unknown>) ?? {},
      storyMemory: (body.storyMemory as Record<string, unknown>) ?? {},
      recentMessages: body.recentMessages as RetrievePayload["recentMessages"],
      memoryMode: typeof body.memoryMode === "string" ? body.memoryMode : undefined,
    };

    const result = await handleRetrieve(supabase, payload, authUserId);
    return jsonOk(result);
  } catch (err) {
    // Auth errors carry their own status code and generic message.
    if (err && typeof err === "object" && (err as Record<string, unknown>).__auth) {
      const ae = err as { status: number; message: string };
      return jsonAuthError(ae.status, ae.message);
    }
    console.error("memory-retrieve error:", err);
    return jsonError(500, "Internal server error");
  }
});

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------

/**
 * Extract the Bearer token from an Authorization header value.
 * Returns null when the header is malformed or the token part is empty.
 */
function getBearerToken(header: string): string | null {
  if (!header) return null;
  const parts = header.split(" ");
  if (parts.length !== 2 || parts[0].toLowerCase() !== "bearer") return null;
  const token = parts[1];
  return token.length > 0 ? token : null;
}

/**
 * Attempt to validate a Supabase access_token from the Authorization header.
 *
 * - No Authorization header → returns null (personal mode, authUserId=null).
 * - Authorization header present but malformed / token empty / token invalid /
 *   token expired → returns a 401 Response.  Never falls through to anonymous.
 * - Authorization present and token valid → returns the user's UUID string.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getOptionalAuthUserId(
  supabase: any,
  req: Request,
): Promise<string | null | Response> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return null;  // Header absent → personal mode

  const token = getBearerToken(authHeader);
  if (!token) {
    // Header exists but is malformed or token is empty → reject.
    return jsonAuthError(401, "Unauthorized");
  }

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user?.id) {
    // Token is invalid or expired — don't leak details.
    return jsonAuthError(401, "Unauthorized");
  }
  return data.user.id as string;
}

// ---------------------------------------------------------------------------
// Core logic
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleRetrieve(
  supabase: any,
  payload: RetrievePayload,
  authUserId: string | null,
): Promise<RetrieveResponse> {
  const clientConvId = payload.conversationId;
  const budget = payload.budget;

  // --- (1) Resolve client_conversation_id → uuid + user_id ----------
  const { data: conv, error: convErr } = await supabase
    .from("conversations")
    .select("id, user_id")
    .eq("client_conversation_id", clientConvId)
    .maybeSingle();

  if (convErr) throw convErr;

  // No conversation → no memory to retrieve.
  if (!conv) {
    return emptyResult();
  }

  // --- (2) Auth check on conversation ownership ----------------------
  const rowUserId: string | null = conv.user_id ?? null;

  if (authUserId) {
    if (rowUserId !== null && rowUserId !== authUserId) {
      // Authenticated user trying to read another user's conversation.
      authError(403, "Forbidden");
    }
    // rowUserId === null: allow (authenticated user reads unowned row).
    // rowUserId === authUserId: allow (reading own row).
  } else {
    if (rowUserId !== null) {
      // Unauthenticated request trying to read an owned conversation.
      // Return empty result instead of 403 to avoid information leak —
      // a 403 would confirm that the conversation exists.
      return emptyResult();
    }
    // rowUserId === null: personal row, personal request — allow.
  }

  const conversationUuid = conv.id;

  // --- (3) Query active memory_facts --------------------------------
  // Order by importance desc, then updated_at desc (most recent first
  // among equally-important facts).  Limit to MAX_FACTS rows.

  const { data: facts, error: factsErr } = await supabase
    .from("memory_facts")
    .select("id, content, type, importance, updated_at")
    .eq("conversation_id", conversationUuid)
    .eq("status", "active")
    .order("importance", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(MAX_FACTS);

  if (factsErr) throw factsErr;

  if (!facts || facts.length === 0) {
    return emptyResult();
  }

  const typedFacts = facts as unknown as MemoryFact[];

  // --- (4) Assemble memoryText within budget ------------------------
  // Append facts in order until adding the next fact would exceed budget.
  // Each fact is prefixed with its type and importance for context.

  const parts: string[] = [];
  const selectedIds: string[] = [];
  let charCount = 0;

  for (const fact of typedFacts) {
    const line = `[${fact.type} · ★${fact.importance}]\n${fact.content}`;
    const separator = parts.length > 0 ? FACT_SEPARATOR : "";
    const added = separator.length + line.length;

    if (charCount + added > budget) {
      // If no facts have been added yet, truncate the first one to fit
      // instead of returning empty.  Ensures small budgets still get content.
      if (parts.length === 0) {
        const truncated = line.slice(0, budget);
        parts.push(truncated);
        selectedIds.push(fact.id);
      }
      break;
    }

    parts.push(line);
    selectedIds.push(fact.id);
    charCount += added;
  }

  const memoryText = parts.join(FACT_SEPARATOR);

  return {
    memoryText,
    selectedChapterIds: [],
    selectedFactIds: selectedIds,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function emptyResult(): RetrieveResponse {
  return {
    memoryText: "",
    selectedChapterIds: [],
    selectedFactIds: [],
  };
}

function jsonOk(data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: JSON_HEADERS,
  });
}

function jsonError(status: number, message: string): Response {
  return new Response(
    JSON.stringify({ ok: false, error: message }),
    { status, headers: JSON_HEADERS },
  );
}

function jsonAuthError(status: number, message: string): Response {
  return new Response(
    JSON.stringify({ ok: false, error: message }),
    { status, headers: JSON_HEADERS },
  );
}

/**
 * Throw a structured auth error that the catch block recognises.
 * Never includes DB detail — just a generic message and the HTTP status.
 */
function authError(status: number, message: string): never {
  throw Object.assign(new Error(message), { __auth: true, status, message });
}
