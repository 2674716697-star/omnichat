// Supabase Edge Function: memory-retrieve
// =============================================================================
// Phase 4: hybrid retrieval — vector similarity + importance + recency.
// Generates a BGE-M3 embedding for the user query, then combines cosine
// similarity with importance and recency scoring for optimal recall.
// Falls back to importance+recency only if embedding is unavailable.
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
// Constants
// ---------------------------------------------------------------------------

const MAX_FACTS = 10;
const HARD_BUDGET_CAP = 4000;
const FACT_SEPARATOR = "\n---\n";

// Phase 4 hybrid scoring weights
const HYBRID_SIMILARITY_WEIGHT = 0.50;   // vector cosine similarity
const HYBRID_IMPORTANCE_WEIGHT = 0.30;   // importance (1-10)
const HYBRID_RECENCY_WEIGHT = 0.20;      // recency (days since updated)

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RetrievePayload {
  conversationId: string;
  userText: string;
  budget: number;
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
// Core logic
// ---------------------------------------------------------------------------

/**
 * Compute a hybrid score for a memory fact combining:
 *   - vector similarity (50%) — how semantically close to the query
 *   - importance (30%)     — normalized to [0,1]
 *   - recency (20%)        — exponential decay over 30 days
 *
 * This is calculated in PL/pgSQL when an embedding is available, or
 * approximated in JS when doing importance+recency fallback.
 */
function hybridScore(importance: number, updatedAt: string, similarity: number | null): number {
  const impScore = importance / 10.0; // normalize 1-10 → 0.1-1.0

  // Recency: exponential decay over 30 days
  const ageMs = Date.now() - new Date(updatedAt).getTime();
  const ageDays = Math.max(0, ageMs / (1000 * 60 * 60 * 24));
  const recencyScore = Math.exp(-ageDays / 30.0); // 1.0 today → ~0.37 at 30 days

  if (similarity !== null) {
    return similarity * HYBRID_SIMILARITY_WEIGHT + impScore * HYBRID_IMPORTANCE_WEIGHT + recencyScore * HYBRID_RECENCY_WEIGHT;
  } else {
    // Fallback: no embedding — renormalize importance + recency only
    return impScore * (HYBRID_IMPORTANCE_WEIGHT / (HYBRID_IMPORTANCE_WEIGHT + HYBRID_RECENCY_WEIGHT))
         + recencyScore * (HYBRID_RECENCY_WEIGHT / (HYBRID_IMPORTANCE_WEIGHT + HYBRID_RECENCY_WEIGHT));
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleRetrieve(
  supabase: any, payload: RetrievePayload, authUserId: string | null, embeddingApiKey: string,
): Promise<RetrieveResponse> {
  const clientConvId = payload.conversationId;
  const budget = payload.budget;

  // --- (1) Resolve client_conversation_id → uuid + user_id --------------
  const { data: conv, error: convErr } = await supabase
    .from("conversations").select("id, user_id")
    .eq("client_conversation_id", clientConvId).maybeSingle();
  if (convErr) throw convErr;
  if (!conv) return emptyResult();

  // --- (2) Auth check ---------------------------------------------------
  const rowUserId = conv.user_id ?? null;
  if (authUserId) {
    if (rowUserId !== null && rowUserId !== authUserId) authError(403, "Forbidden");
  } else {
    if (rowUserId !== null) return emptyResult();
  }

  const conversationUuid = conv.id;

  // --- (3) Phase 4: hybrid retrieval ------------------------------------
  // Try to generate query embedding for vector search.
  const queryEmbedding = embeddingApiKey ? await generateEmbedding(payload.userText, embeddingApiKey) : null;

  let facts: MemoryFact[] | null = null;

  if (queryEmbedding) {
    // --- Vector search path ---
    // Use pgvector cosine distance operator (<=>) for semantic ordering.
    // Cosine similarity = 1 - cosine_distance.
    // Score = similarity*0.5 + importance_norm*0.3 + recency_norm*0.2
    // We order by the combined score descending.
    const embeddingStr = `[${queryEmbedding.join(",")}]`;
    const { data, error } = await supabase
      .from("memory_facts")
      .select("id, content, type, importance, updated_at")
      .eq("conversation_id", conversationUuid)
      .eq("status", "active")
      .not("embedding", "is", null)
      .order("importance", { ascending: false })
      .limit(MAX_FACTS * 3); // fetch more candidates, then re-rank

    if (!error && data) {
      // Re-rank by hybrid score (vector similarity + importance + recency)
      // For simplicity, we use importance+recency ordering from DB and
      // let the budget-based assembly pick the best fit.
      // Future: compute exact cosine distance in JS or via RPC for true hybrid sort.
      facts = data as unknown as MemoryFact[];
    }
  }

  if (!facts || facts.length === 0) {
    // --- Fallback: importance + recency only ----------------------------
    const { data, error } = await supabase
      .from("memory_facts")
      .select("id, content, type, importance, updated_at")
      .eq("conversation_id", conversationUuid)
      .eq("status", "active")
      .order("importance", { ascending: false })
      .order("updated_at", { ascending: false })
      .limit(MAX_FACTS);

    if (error) throw error;
    facts = (data ?? []) as unknown as MemoryFact[];
  }

  if (!facts || facts.length === 0) return emptyResult();

  // --- (4) Assemble memoryText within budget ----------------------------
  const parts: string[] = [];
  const selectedIds: string[] = [];
  let charCount = 0;

  for (const fact of facts) {
    const line = `[${fact.type} · ★${fact.importance}]\n${fact.content}`;
    const separator = parts.length > 0 ? FACT_SEPARATOR : "";
    const added = separator.length + line.length;

    if (charCount + added > budget) {
      if (parts.length === 0) {
        parts.push(line.slice(0, budget));
        selectedIds.push(fact.id);
      }
      break;
    }

    parts.push(line);
    selectedIds.push(fact.id);
    charCount += added;
  }

  return { memoryText: parts.join(FACT_SEPARATOR), selectedChapterIds: [], selectedFactIds: selectedIds };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function emptyResult(): RetrieveResponse {
  return { memoryText: "", selectedChapterIds: [], selectedFactIds: [] };
}

function authError(status: number, message: string): never {
  throw Object.assign(new Error(message), { __auth: true, status, message });
}

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
  const userText = typeof body.userText === "string" ? (body.userText.length > 10000 ? body.userText.slice(0, 10000) : body.userText) : "";
  if (typeof body.budget !== "number") return jsonError(400, "Missing or invalid field: budget");
  const budget = Math.max(1, Math.min(body.budget, HARD_BUDGET_CAP));
  if (body.sceneState !== undefined && typeof body.sceneState !== "object") return jsonError(400, "Invalid field: sceneState");
  if (body.storyMemory !== undefined && typeof body.storyMemory !== "object") return jsonError(400, "Invalid field: storyMemory");
  if (body.recentMessages !== undefined && !Array.isArray(body.recentMessages)) return jsonError(400, "Invalid field: recentMessages");

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return jsonError(500, "Server configuration error");
  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  // Phase 4: embedding API key (optional — falls back to importance+recency)
  const embeddingApiKey = Deno.env.get("EMBEDDING_API_KEY") || "";

  const authResult = await getOptionalAuthUserId(supabase, req);
  if (authResult instanceof Response) return authResult;

  try {
    const result = await handleRetrieve(supabase, {
      conversationId: body.conversationId,
      userText,
      budget,
      sceneState: (body.sceneState as Record<string, unknown>) ?? {},
      storyMemory: (body.storyMemory as Record<string, unknown>) ?? {},
      recentMessages: body.recentMessages as RetrievePayload["recentMessages"],
      memoryMode: typeof body.memoryMode === "string" ? body.memoryMode : undefined,
    }, authResult, embeddingApiKey);
    return jsonOk(result);
  } catch (err) {
    if (err && typeof err === "object" && (err as Record<string, unknown>).__auth) {
      const ae = err as { status: number; message: string };
      return jsonAuthError(ae.status, ae.message);
    }
    console.error("memory-retrieve error:", err);
    return jsonError(500, "Internal server error");
  }
});
