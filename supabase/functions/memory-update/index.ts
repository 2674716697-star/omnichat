// Supabase Edge Function: memory-update
// =============================================================================
// Draft — does NOT persist data yet.  Returns an empty ack to match the
// frontend RemoteMemoryAdapter /api/memory/update contract so the UI path
// can be tested without a live database.
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

  const storyContent = body.storyContent;
  if (typeof storyContent !== "string") {
    return jsonError(400, "Missing or invalid field: storyContent");
  }

  // sceneState, storyMemory, recentMessages — type-check but don't reject.
  // Frontend sends them for future use; currently unused.
  if (body.sceneState !== undefined && typeof body.sceneState !== "object") {
    return jsonError(400, "Invalid field: sceneState (must be an object)");
  }
  if (body.storyMemory !== undefined && typeof body.storyMemory !== "object") {
    return jsonError(400, "Invalid field: storyMemory (must be an object)");
  }
  if (body.recentMessages !== undefined && !Array.isArray(body.recentMessages)) {
    return jsonError(400, "Invalid field: recentMessages (must be an array)");
  }

  // --- Stub response — ack only --------------------------------------
  // TODO: When Supabase client is wired up:
  //   1. Create a Supabase client with service_role key.
  //   2. Call an auxiliary model to produce chapter summary + pinned facts.
  //   3. Upsert story_chapters rows.
  //   4. Upsert memory_facts rows.
  //   5. Return the actual chapters / pinnedFacts / unresolvedThreads.
  //
  // Example client init (requires Deno env vars):
  //   import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
  //   const supabase = createClient(
  //     Deno.env.get("SUPABASE_URL")!,
  //     Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  //   );

  return jsonOk({
    chapters: [],
    pinnedFacts: [],
    unresolvedThreads: [],
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
