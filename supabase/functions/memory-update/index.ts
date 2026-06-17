// Supabase Edge Function: memory-update
// =============================================================================
// Phase 4: embedding-enabled write.  Generates a BGE-M3 embedding via SiliconFlow
// for each new memory_fact before inserting into the database.
// =============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const EMBEDDING_API_URL = "https://api.siliconflow.cn/v1/embeddings";
const EMBEDDING_MODEL = "BAAI/bge-m3";
const EMBEDDING_DIM = 1024;

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
  conversationId: string;
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
// Embedding helpers
// ---------------------------------------------------------------------------

/**
 * Call SiliconFlow embedding API to generate a BGE-M3 vector for the given text.
 * Returns a 1024-dimensional float array, or null on failure.
 */
async function generateEmbedding(text: string, apiKey: string): Promise<number[] | null> {
  try {
    const response = await fetch(EMBEDDING_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: text,
        encoding_format: "float",
      }),
    });

    if (!response.ok) {
      console.error(`Embedding API error: HTTP ${response.status}`);
      return null;
    }

    const result = await response.json();
    const embedding = result?.data?.[0]?.embedding;

    if (!embedding || !Array.isArray(embedding) || embedding.length !== EMBEDDING_DIM) {
      console.error("Embedding API returned invalid vector");
      return null;
    }

    return embedding as number[];
  } catch (err) {
    console.error("Embedding API call failed:", err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------

function getBearerToken(header: string): string | null {
  if (!header) return null;
  const parts = header.split(" ");
  if (parts.length !== 2 || parts[0].toLowerCase() !== "bearer") return null;
  const token = parts[1];
  return token.length > 0 ? token : null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getOptionalAuthUserId(supabase: any, req: Request): Promise<string | null | Response> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return null;
  const token = getBearerToken(authHeader);
  if (!token) return jsonAuthError(401, "Unauthorized");
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user?.id) return jsonAuthError(401, "Unauthorized");
  return data.user.id as string;
}

// ---------------------------------------------------------------------------
// Ownership helpers
// ---------------------------------------------------------------------------

async function generateDeterministicUuid(input: string): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  const bytes = new Uint8Array(hash, 0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function selectByClientConvIdWithBackoff(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any, clientConvId: string, delays: number[] = [50, 100, 200, 400, 800],
): Promise<{ id: string; user_id: string | null } | null> {
  for (const delay of delays) {
    await sleep(delay);
    const { data, error } = await supabase
      .from("conversations").select("id, user_id")
      .eq("client_conversation_id", clientConvId).maybeSingle();
    if (error) throw error;
    if (data) return data;
  }
  return null;
}

function authError(status: number, message: string): never {
  throw Object.assign(new Error(message), { __auth: true, status, message });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function resolveConversationOwnership(
  supabase: any, row: { id: string; user_id: string | null }, authUserId: string | null,
): Promise<string> {
  const rowUserId = row.user_id ?? null;
  if (authUserId) {
    if (rowUserId === null) {
      const { data: claimed, error: claimErr } = await supabase
        .from("conversations").update({ user_id: authUserId })
        .eq("id", row.id).is("user_id", null)
        .select("id, user_id").maybeSingle();
      if (claimErr) throw claimErr;
      if (!claimed) {
        const { data: refetched, error: refetchErr } = await supabase
          .from("conversations").select("id, user_id").eq("id", row.id).maybeSingle();
        if (refetchErr) throw refetchErr;
        if (refetched && refetched.user_id === authUserId) return refetched.id;
        authError(403, "Forbidden");
      }
      return claimed.id;
    } else if (rowUserId !== authUserId) {
      authError(403, "Forbidden");
    }
  } else {
    if (rowUserId !== null) authError(403, "Forbidden");
  }
  return row.id;
}

// ---------------------------------------------------------------------------
// Core logic
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleUpdate(
  supabase: any, payload: UpdatePayload, authUserId: string | null, embeddingApiKey: string,
): Promise<UpdateResponse> {
  const clientConvId = payload.conversationId;

  // --- (a) Resolve or create conversation --------------------------------
  const { data: existingConv, error: selectErr } = await supabase
    .from("conversations").select("id, user_id")
    .eq("client_conversation_id", clientConvId).maybeSingle();
  if (selectErr) throw selectErr;

  let conversationUuid: string;

  if (existingConv) {
    conversationUuid = await resolveConversationOwnership(supabase, existingConv, authUserId);
  } else {
    const deterministicUuid = await generateDeterministicUuid(clientConvId);
    const { data: insertedConv, error: insertErr } = await supabase
      .from("conversations").insert({ id: deterministicUuid, client_conversation_id: clientConvId, user_id: authUserId })
      .select("id, user_id").single();
    if (insertErr) {
      if (insertErr.code === "23505") {
        const retryConv = await selectByClientConvIdWithBackoff(supabase, clientConvId);
        if (!retryConv) throw insertErr;
        conversationUuid = await resolveConversationOwnership(supabase, retryConv, authUserId);
      } else throw insertErr;
    } else {
      conversationUuid = insertedConv.id;
    }
  }

  // --- (b) Upsert story_states ------------------------------------------
  const sceneState = payload.sceneState ?? {};
  const storyMemory = payload.storyMemory ?? {};
  const { error: stateErr } = await supabase.from("story_states").upsert({
    conversation_id: conversationUuid,
    scene_state_json: sceneState,
    world_json: storyMemory,
    character_json: sceneState.currentCharacter ? { name: sceneState.currentCharacter } : {},
    status_json: {},
    npcs_json: Array.isArray(sceneState.npcs) ? sceneState.npcs : [],
  }, { onConflict: "conversation_id" });
  if (stateErr) throw stateErr;

  // --- (c) Insert memory_fact WITH embedding ----------------------------
  const factContent = payload.storyContent.slice(0, 1000);
  let insertedFact = false;

  if (factContent.length > 0) {
    // Phase 4: generate embedding for semantic retrieval
    const embedding = embeddingApiKey ? await generateEmbedding(factContent, embeddingApiKey) : null;

    const factUuid = await generateDeterministicUuid(`${conversationUuid}:remote-update:${factContent}`);

    const factRow: Record<string, unknown> = {
      id: factUuid,
      conversation_id: conversationUuid,
      type: "plot_thread",
      content: factContent,
      importance: 5,
      status: "active",
      source: "remote-update",
    };

    // Include embedding if generated successfully
    if (embedding) {
      factRow.embedding = embedding;
    }

    const { error: factErr } = await supabase.from("memory_facts").insert(factRow);

    if (factErr) {
      if (factErr.code === "23505") {
        insertedFact = false;
      } else {
        throw factErr;
      }
    } else {
      insertedFact = true;
    }
  }

  return { ok: true, conversationUuid, insertedFact, chapters: [], pinnedFacts: [], unresolvedThreads: [] };
}

// ---------------------------------------------------------------------------
// Response helpers
// ---------------------------------------------------------------------------

function jsonOk(data: unknown): Response {
  return new Response(JSON.stringify(data), { status: 200, headers: JSON_HEADERS });
}

function jsonError(status: number, message: string): Response {
  return new Response(JSON.stringify({ ok: false, error: message }), { status, headers: JSON_HEADERS });
}

function jsonAuthError(status: number, message: string): Response {
  return new Response(JSON.stringify({ ok: false, error: message }), { status, headers: JSON_HEADERS });
}

// ---------------------------------------------------------------------------
// Request handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS_HEADERS });
  if (req.method !== "POST") return jsonError(405, "Method not allowed");

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return jsonError(400, "Invalid JSON body"); }
  if (!body || typeof body !== "object") return jsonError(400, "Body must be a JSON object");

  if (typeof body.conversationId !== "string" || body.conversationId.length === 0) return jsonError(400, "Missing or invalid field: conversationId");
  if (body.conversationId.length > 200) return jsonError(400, "conversationId too long");
  if (typeof body.storyContent !== "string" || body.storyContent.length === 0) return jsonError(400, "Missing or invalid field: storyContent");
  const storyContent = body.storyContent.length > 10000 ? body.storyContent.slice(0, 10000) : body.storyContent;
  if (body.sceneState !== undefined && typeof body.sceneState !== "object") return jsonError(400, "Invalid field: sceneState");
  if (body.storyMemory !== undefined && typeof body.storyMemory !== "object") return jsonError(400, "Invalid field: storyMemory");
  if (body.recentMessages !== undefined && !Array.isArray(body.recentMessages)) return jsonError(400, "Invalid field: recentMessages");

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return jsonError(500, "Server configuration error");
  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  // Phase 4: embedding API key (optional — falls back to no embedding)
  const embeddingApiKey = Deno.env.get("EMBEDDING_API_KEY") || "";

  const authResult = await getOptionalAuthUserId(supabase, req);
  if (authResult instanceof Response) return authResult;
  const authUserId = authResult;

  try {
    const result = await handleUpdate(supabase, {
      conversationId: body.conversationId,
      storyContent,
      sceneState: (body.sceneState as Record<string, unknown>) ?? {},
      storyMemory: (body.storyMemory as Record<string, unknown>) ?? {},
      recentMessages: body.recentMessages as UpdatePayload["recentMessages"],
      memoryMode: typeof body.memoryMode === "string" ? body.memoryMode : undefined,
    }, authUserId, embeddingApiKey);
    return jsonOk(result);
  } catch (err) {
    if (err && typeof err === "object" && (err as Record<string, unknown>).__auth) {
      const ae = err as { status: number; message: string };
      return jsonAuthError(ae.status, ae.message);
    }
    console.error("memory-update error:", err);
    return jsonError(500, "Internal server error");
  }
});
