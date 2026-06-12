// Supabase Edge Function: memory-retrieve
// =============================================================================
// Draft — does NOT query the database yet.  Returns an empty result to match
// the frontend RemoteMemoryAdapter /api/memory/retrieve contract so the UI
// path can be tested without a live database.
// =============================================================================

// ---------------------------------------------------------------------------
// CORS headers
// ---------------------------------------------------------------------------

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

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

  // --- Parse JSON body (defensive) -----------------------------------
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

  const userText = body.userText;
  if (typeof userText !== "string") {
    return jsonError(400, "Missing or invalid field: userText");
  }

  const budget = body.budget;
  if (typeof budget !== "number" || budget <= 0) {
    return jsonError(400, "Missing or invalid field: budget (must be a positive number)");
  }

  // --- Optional fields: type-check only ------------------------------
  if (body.sceneState !== undefined && typeof body.sceneState !== "object") {
    return jsonError(400, "Invalid field: sceneState (must be an object)");
  }
  if (body.storyMemory !== undefined && typeof body.storyMemory !== "object") {
    return jsonError(400, "Invalid field: storyMemory (must be an object)");
  }
  if (body.recentMessages !== undefined && !Array.isArray(body.recentMessages)) {
    return jsonError(400, "Invalid field: recentMessages (must be an array)");
  }

  // --- Stub response — empty result ----------------------------------
  // TODO: When Supabase client + retrieval logic is wired up:
  //   1. Create a Supabase client with service_role key.
  //   2. Select active memory_facts for this conversation.
  //   3. Select relevant story_chapters (by recency or keyword match).
  //   4. (Phase 4) Use pgvector embedding similarity for semantic search.
  //   5. Assemble memoryText string within budget.
  //   6. Return selected chapter + fact IDs so frontend can track used items.
  //
  // Example keyword-based retrieval:
  //   import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
  //   const supabase = createClient(
  //     Deno.env.get("SUPABASE_URL")!,
  //     Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  //   );
  //   const { data } = await supabase
  //     .from("memory_facts")
  //     .select("id, content, type, importance")
  //     .eq("conversation_id", conversationId)
  //     .eq("status", "active")
  //     .order("importance", { ascending: false })
  //     .limit(20);

  return jsonOk({
    memoryText: "",
    selectedChapterIds: [],
    selectedFactIds: [],
  });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function jsonOk(data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

function jsonError(status: number, message: string): Response {
  return new Response(
    JSON.stringify({ error: message }),
    {
      status,
      headers: {
        ...CORS_HEADERS,
        "Content-Type": "application/json; charset=utf-8",
      },
    },
  );
}
