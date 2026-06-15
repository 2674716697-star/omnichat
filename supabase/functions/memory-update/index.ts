// Supabase Edge Function: memory-update
// =============================================================================
// Receives conversation content from the frontend after each reply completes.
// Persists conversation metadata, story state, and a raw story fragment into
// memory_facts.  Does NOT call any auxiliary model yet (Phase 2 minimal write).
//
// Auth: service_role (bypasses RLS).  The frontend does NOT send API keys.
// Phase 1.1: optional Auth identity binding — when an Authorization: Bearer
// header is present, the function validates the token and binds the
// conversation to the authenticated user.  Without a token, personal mode
// (user_id = NULL) is still allowed.
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
// Types
// ---------------------------------------------------------------------------

interface UpdatePayload {
  conversationId: string;   // frontend generateId() — NOT a UUID
  storyContent: string;
  sceneState?: Record<string, unknown>;
  storyMemory?: Record<string, unknown>;
  recentMessages?: Array<{ role: string; content: string }>;
  memoryMode?: string;
}

interface UpdateResponse {
  ok: boolean;
  conversationUuid: string;
  insertedFact: boolean;
  chapters: never[];
  pinnedFacts: never[];
  unresolvedThreads: never[];
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

  const storyContentRaw = body.storyContent;
  if (typeof storyContentRaw !== "string") {
    return jsonError(400, "Missing or invalid field: storyContent");
  }
  // Defend against extreme payloads — truncate early before any DB work.
  const storyContent = storyContentRaw.length > 10000
    ? storyContentRaw.slice(0, 10000)
    : storyContentRaw;

  // Optional fields: type-check only (don't reject on missing)
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
    const payload: UpdatePayload = {
      conversationId,
      storyContent,
      sceneState: (body.sceneState as Record<string, unknown>) ?? {},
      storyMemory: (body.storyMemory as Record<string, unknown>) ?? {},
      recentMessages: body.recentMessages as UpdatePayload["recentMessages"],
      memoryMode: typeof body.memoryMode === "string" ? body.memoryMode : undefined,
    };

    const result = await handleUpdate(supabase, payload, authUserId);
    return jsonOk(result);
  } catch (err) {
    // Auth errors carry their own status code and generic message.
    if (err && typeof err === "object" && (err as Record<string, unknown>).__auth) {
      const ae = err as { status: number; message: string };
      return jsonAuthError(ae.status, ae.message);
    }
    console.error("memory-update error:", err);
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
// Helpers (used by core logic)
// ---------------------------------------------------------------------------

/**
 * Generate a deterministic UUID v4 from an arbitrary input string.
 * Uses SHA-256, takes the first 16 bytes, then sets v4 version/variant bits.
 * Same input always produces the same UUID — this is the key that lets
 * concurrent requests naturally resolve to a single PK in Postgres.
 */
async function generateDeterministicUuid(input: string): Promise<string> {
  const hash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(input),
  );
  const bytes = new Uint8Array(hash, 0, 16);
  // Set version 4 (byte 6, high nibble → 0100)
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  // Set variant 1 (byte 8, high nibble → 10xx)
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

/**
 * Backoff SELECT by client_conversation_id — retries with increasing delays.
 * Used as a fallback when upsert hits 23505 against the client_conversation_id
 * partial unique index (legacy row with a different PK that wasn't visible
 * under our first SELECT).  Returns the full row so auth checks can be applied.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function selectByClientConvIdWithBackoff(
  supabase: any,
  clientConvId: string,
  delays: number[] = [50, 100, 200, 400, 800],
): Promise<{ id: string; user_id: string | null } | null> {
  for (const delay of delays) {
    await sleep(delay);
    const { data, error } = await supabase
      .from("conversations")
      .select("id, user_id")
      .eq("client_conversation_id", clientConvId)
      .maybeSingle();
    if (error) throw error;
    if (data) return data;
  }
  return null;
}

/**
 * Throw a structured auth error that the catch block recognises.
 * Never includes DB detail — just a generic message and the HTTP status.
 */
function authError(status: number, message: string): never {
  throw Object.assign(new Error(message), { __auth: true, status, message });
}

/**
 * Verify ownership of an existing conversation row, and optionally claim it
 * for the authenticated user when it's currently unowned.
 *
 * Claiming uses a conditional UPDATE … WHERE user_id IS NULL so that two
 * concurrent authenticated users cannot both claim the same row — Postgres
 * serialises the updates and only the first one sees a matching row.
 *
 * On claim miss (someone else beat us), we re-fetch the row:
 *  - If it's now ours (a previous request of ours won) → allow.
 *  - If it's someone else's → 403 Forbidden.
 *
 * Returns the conversation UUID when access is allowed; throws authError on
 * 403 or on unexpected DB errors.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function resolveConversationOwnership(
  supabase: any,
  row: { id: string; user_id: string | null },
  authUserId: string | null,
): Promise<string> {
  const rowUserId: string | null = row.user_id ?? null;

  if (authUserId) {
    if (rowUserId === null) {
      // Authenticated user attempts to claim an unowned row.
      // Conditional update: only succeeds if user_id is still null.
      const { data: claimed, error: claimErr } = await supabase
        .from("conversations")
        .update({ user_id: authUserId })
        .eq("id", row.id)
        .is("user_id", null)
        .select("id, user_id")
        .maybeSingle();

      if (claimErr) throw claimErr;

      if (!claimed) {
        // Claim failed — someone else claimed it concurrently.
        // Re-fetch to determine who owns it now.
        const { data: refetched, error: refetchErr } = await supabase
          .from("conversations")
          .select("id, user_id")
          .eq("id", row.id)
          .maybeSingle();

        if (refetchErr) throw refetchErr;

        if (refetched && refetched.user_id === authUserId) {
          // Our own earlier request won the race.
          return refetched.id;
        }
        // Owned by someone else.
        authError(403, "Forbidden");
      }
      return claimed.id;
    } else if (rowUserId !== authUserId) {
      // Authenticated user trying to write into another user's conversation.
      authError(403, "Forbidden");
    }
    // rowUserId === authUserId: already owns, allow.
  } else {
    // No auth token — only allow writing into unowned rows.
    if (rowUserId !== null) {
      authError(403, "Forbidden");
    }
  }
  return row.id;
}

// ---------------------------------------------------------------------------
// Core logic
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleUpdate(
  supabase: any,
  payload: UpdatePayload,
  authUserId: string | null,
): Promise<UpdateResponse> {
  const clientConvId = payload.conversationId;

  // --- (a) Resolve or create conversation ----------------------------
  // Strategy: deterministic-id + INSERT (not upsert).
  //
  // 1. SELECT by client_conversation_id — backward compat with existing rows.
  // 2. If missing, generate a deterministic UUID from clientConvId (SHA-256 →
  //    first 16 bytes → UUID v4 mask).  INSERT the new row — NOT upsert,
  //    because upsert on conflict would overwrite user_id and let a second
  //    user steal a row from the first.
  // 3. If INSERT hits 23505 (PK or client_conversation_id unique violation),
  //    another request beat us.  Backoff SELECT to find the winner, then run
  //    the same auth check / conditional-claim logic as for an existing row.
  //
  // Phase 1.1: the SELECT fetches user_id.  resolveConversationOwnership()
  // handles auth checks and conditional claiming atomically.

  const { data: existingConv, error: selectErr } = await supabase
    .from("conversations")
    .select("id, user_id")
    .eq("client_conversation_id", clientConvId)
    .maybeSingle();

  if (selectErr) throw selectErr;

  let conversationUuid: string;

  if (existingConv) {
    // --- Auth check + optional claim on existing row ------------------
    conversationUuid = await resolveConversationOwnership(supabase, existingConv, authUserId);
  } else {
    // --- New row: insert with deterministic UUID (NOT upsert) ---------
    // Insert, don't upsert — upsert would blindly overwrite user_id on
    // conflict, allowing a second user to steal a row from the first.
    const deterministicUuid = await generateDeterministicUuid(clientConvId);

    const { data: insertedConv, error: insertErr } = await supabase
      .from("conversations")
      .insert({
        id: deterministicUuid,
        client_conversation_id: clientConvId,
        user_id: authUserId,   // null for personal, uuid for authenticated
      })
      .select("id, user_id")
      .single();

    if (insertErr) {
      if (insertErr.code === "23505") {
        // PK or client_conversation_id unique violation — another request
        // already created a row.  Backoff SELECT to find it, then run the
        // same auth check / conditional-claim logic as for an existing row.
        const retryConv = await selectByClientConvIdWithBackoff(supabase, clientConvId);
        if (!retryConv) throw insertErr;
        conversationUuid = await resolveConversationOwnership(supabase, retryConv, authUserId);
      } else {
        throw insertErr;
      }
    } else {
      conversationUuid = insertedConv.id;
    }
  }

  // --- (c) Upsert story_states ---------------------------------------
  // conversation_id is the PK; upsert overwrites on conflict.
  // No user_id column on story_states — ownership flows through
  // conversations.user_id (checked above).

  const sceneState = payload.sceneState ?? {};
  const storyMemory = payload.storyMemory ?? {};

  const { error: stateErr } = await supabase
    .from("story_states")
    .upsert(
      {
        conversation_id: conversationUuid,
        scene_state_json: sceneState,
        world_json: storyMemory,
        character_json: sceneState.currentCharacter
          ? { name: sceneState.currentCharacter }
          : {},
        status_json: {},
        npcs_json: Array.isArray(sceneState.npcs) ? sceneState.npcs : [],
      },
      { onConflict: "conversation_id" },
    );

  if (stateErr) throw stateErr;

  // --- (d) Insert memory_fact (deterministic-id dedup) ------------------
  // Truncate storyContent to 1000 chars.  Generate a deterministic UUID from
  // conversationUuid + source + content so that concurrent requests for the
  // same fact contend on the same PK.  First writer wins; duplicates get
  // 23505 (unique violation) and report insertedFact=false without error.

  const factContent = payload.storyContent.slice(0, 1000);
  let insertedFact = false;

  if (factContent.length > 0) {
    const factUuid = await generateDeterministicUuid(
      `${conversationUuid}:remote-update:${factContent}`,
    );

    const { error: factErr } = await supabase
      .from("memory_facts")
      .insert({
        id: factUuid,
        conversation_id: conversationUuid,
        type: "plot_thread",
        content: factContent,
        importance: 5,
        status: "active",
        source: "remote-update",
      });

    if (factErr) {
      if (factErr.code === "23505") {
        // Duplicate — another concurrent request already wrote this fact.
        // Not an error; just report insertedFact=false.
        insertedFact = false;
      } else {
        throw factErr;
      }
    } else {
      insertedFact = true;
    }
  }

  // --- (e) Return ----------------------------------------------------
  return {
    ok: true,
    conversationUuid,
    insertedFact,
    chapters: [],
    pinnedFacts: [],
    unresolvedThreads: [],
  };
}

// ---------------------------------------------------------------------------
// Response helpers
// ---------------------------------------------------------------------------

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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
