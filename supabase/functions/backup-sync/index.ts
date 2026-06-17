// Supabase Edge Function: backup-sync
// =============================================================================
// Syncs full conversation backups to the cloud. Two operations:
//   POST — upsert a backup blob (JSONB) for the authenticated user.
//   GET  — fetch backup metadata (or full data with ?full=true).
//
// Auth: service_role (bypasses RLS). When an Authorization: Bearer header is
// present, the function validates the token and binds the backup to the
// authenticated user. Without a token, anonymous access is rejected for
// write operations; reads return hasBackup=false.
// =============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ---------------------------------------------------------------------------
// CORS headers
// ---------------------------------------------------------------------------

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey",
};

const JSON_HEADERS: Record<string, string> = {
  ...CORS_HEADERS,
  "Content-Type": "application/json; charset=utf-8",
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BackupPayload {
  backupData: Record<string, unknown>;
  backupVersion?: number;
  conversationCount?: number;
  messageCount?: number;
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request): Promise<Response> => {
  // --- CORS preflight ------------------------------------------------
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  // --- Route by method -----------------------------------------------
  if (req.method !== "POST" && req.method !== "GET") {
    return jsonError(405, "Method not allowed");
  }

  // --- Env vars ------------------------------------------------------
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env var");
    return jsonError(500, "Server configuration error");
  }

  // --- Supabase client -----------------------------------------------
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });

  // --- Optional auth identity ----------------------------------------
  const authResult = await getOptionalAuthUserId(supabase, req);
  if (authResult instanceof Response) return authResult;
  const authUserId: string | null = authResult;

  // --- Route to handler ----------------------------------------------
  try {
    if (req.method === "POST") {
      // -- Parse JSON body --------------------------------------------
      let body: Record<string, unknown>;
      try {
        body = await req.json();
      } catch {
        return jsonError(400, "Invalid JSON body");
      }
      if (!body || typeof body !== "object") {
        return jsonError(400, "Body must be a JSON object");
      }

      // -- Validate required fields -----------------------------------
      if (!body.backupData || typeof body.backupData !== "object") {
        return jsonError(400, "Missing or invalid field: backupData");
      }

      const payload: BackupPayload = {
        backupData: body.backupData as Record<string, unknown>,
        backupVersion: typeof body.backupVersion === "number" ? body.backupVersion : undefined,
        conversationCount: typeof body.conversationCount === "number" ? body.conversationCount : undefined,
        messageCount: typeof body.messageCount === "number" ? body.messageCount : undefined,
      };

      return await handlePost(supabase, authUserId, payload);
    } else {
      // GET
      const url = new URL(req.url);
      const full = url.searchParams.get("full") === "true";
      return await handleGet(supabase, authUserId, full);
    }
  } catch (err) {
    // Auth errors carry their own status code and generic message.
    if (err && typeof err === "object" && (err as Record<string, unknown>).__auth) {
      const ae = err as { status: number; message: string };
      return jsonAuthError(ae.status, ae.message);
    }
    console.error("backup-sync error:", err);
    return jsonError(500, "Internal server error");
  }
});

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------

/**
 * Extract the Bearer token from an Authorization header value.
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
 *   token expired → returns a 401 Response.
 * - Authorization present and token valid → returns the user's UUID string.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getOptionalAuthUserId(
  supabase: any,
  req: Request,
): Promise<string | null | Response> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return null;

  const token = getBearerToken(authHeader);
  if (!token) {
    return jsonAuthError(401, "Unauthorized");
  }

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user?.id) {
    return jsonAuthError(401, "Unauthorized");
  }
  return data.user.id as string;
}

// ---------------------------------------------------------------------------
// Core handlers
// ---------------------------------------------------------------------------

/**
 * POST — upsert backup data for the authenticated user.
 * Requires a valid auth token (userId must not be null).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handlePost(
  supabase: any,
  userId: string | null,
  payload: BackupPayload,
): Promise<Response> {
  // Authenticated user required for write
  if (!userId) {
    return jsonAuthError(401, "Authentication required to create a backup");
  }

  const now = new Date().toISOString();

  const record: Record<string, unknown> = {
    user_id: userId,
    backup_data: payload.backupData,
    backup_version: payload.backupVersion ?? 1,
    conversation_count: payload.conversationCount ?? 0,
    message_count: payload.messageCount ?? 0,
    updated_at: now,
  };

  // UPSERT: insert or update on conflict (user_id unique index)
  const { error } = await supabase
    .from("cloud_backups")
    .upsert(record, { onConflict: "user_id" });

  if (error) {
    console.error("backup-sync upsert error:", error);
    return jsonError(500, "Failed to save backup");
  }

  return jsonOk({ ok: true, updatedAt: now });
}

/**
 * GET — retrieve backup metadata or full data for the authenticated user.
 * Returns hasBackup=false when no auth token or no backup exists.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleGet(
  supabase: any,
  userId: string | null,
  full: boolean,
): Promise<Response> {
  if (!userId) {
    return jsonOk({ hasBackup: false });
  }

  // Select all columns if full=true, otherwise exclude backup_data
  const selectCols = full
    ? "backup_version, conversation_count, message_count, updated_at, backup_data"
    : "backup_version, conversation_count, message_count, updated_at";

  const { data, error } = await supabase
    .from("cloud_backups")
    .select(selectCols)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("backup-sync select error:", error);
    return jsonError(500, "Failed to fetch backup");
  }

  if (!data) {
    return jsonOk({ hasBackup: false });
  }

  const response: Record<string, unknown> = {
    hasBackup: true,
    backupVersion: data.backup_version,
    conversationCount: data.conversation_count,
    messageCount: data.message_count,
    updatedAt: data.updated_at,
  };

  if (full && data.backup_data) {
    response.backupData = data.backup_data;
  }

  return jsonOk(response);
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
