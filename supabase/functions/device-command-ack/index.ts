import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, X-Device-Id",
};

const MAX_BODY_BYTES = 1024;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type DeviceCredentialRow = {
  secret_hash: string;
  devices: { revoked_at: string | null };
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function authenticateDevice(
  supabase: ReturnType<typeof createClient>,
  req: Request,
): Promise<string | null> {
  const deviceId = req.headers.get("x-device-id") ?? "";
  const authHeader = req.headers.get("authorization") ?? "";
  const secret = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";

  if (!UUID_PATTERN.test(deviceId) || !secret.startsWith("vdt_") || secret.length > 128) {
    return null;
  }

  const { data, error } = await supabase
    .from("device_credentials")
    .select("secret_hash, devices!inner(revoked_at)")
    .eq("device_id", deviceId)
    .is("revoked_at", null)
    .maybeSingle();
  if (error) throw error;

  const credential = data as DeviceCredentialRow | null;
  if (!credential || credential.devices.revoked_at !== null) return null;

  const hash = await sha256Hex(secret);
  return constantTimeEqual(hash, credential.secret_hash) ? deviceId : null;
}

type AckInput = {
  command_id: string;
  stage: "receipt" | "execution";
  outcome: "executed" | "failed" | null;
  failure_reason: string | null;
};

function parseAck(
  raw: unknown,
): { ok: true; value: AckInput } | { ok: false; error: string } {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return { ok: false, error: "Body must be a JSON object." };
  }
  const body = raw as Record<string, unknown>;
  const { command_id, stage, outcome, failure_reason } = body;

  if (typeof command_id !== "string" || !UUID_PATTERN.test(command_id)) {
    return { ok: false, error: "command_id must be a valid command ID." };
  }
  if (stage !== "receipt" && stage !== "execution") {
    return { ok: false, error: "stage must be receipt or execution." };
  }
  if (stage === "receipt") {
    return {
      ok: true,
      value: { command_id, stage, outcome: null, failure_reason: null },
    };
  }
  if (outcome !== "executed" && outcome !== "failed") {
    return { ok: false, error: "outcome must be executed or failed." };
  }
  if (failure_reason !== undefined && failure_reason !== null && typeof failure_reason !== "string") {
    return { ok: false, error: "failure_reason must be text." };
  }
  const reason = typeof failure_reason === "string" ? failure_reason.trim().slice(0, 200) : null;

  return {
    ok: true,
    value: {
      command_id,
      stage,
      outcome,
      failure_reason: outcome === "failed" ? reason : null,
    },
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    const deviceId = await authenticateDevice(supabase, req);
    if (!deviceId) return json({ error: "Unauthorized device" }, 401);

    const text = await req.text();
    if (text.length > MAX_BODY_BYTES) return json({ error: "Payload too large" }, 413);

    let parsedBody: unknown;
    try {
      parsedBody = JSON.parse(text);
    } catch {
      return json({ error: "Body must be valid JSON." }, 400);
    }

    const parsed = parseAck(parsedBody);
    if (!parsed.ok) return json({ error: parsed.error }, 400);
    const ack = parsed.value;

    const { data: status, error } = await supabase.rpc("acknowledge_command", {
      p_device_id: deviceId,
      p_command_id: ack.command_id,
      p_stage: ack.stage,
      p_outcome: ack.outcome,
      p_failure_reason: ack.failure_reason,
    });
    if (error) throw error;

    if (status === "not_found") return json({ error: "Command not found" }, 404);
    if (status === "expired") {
      return json({ error: "Command expired", command_id: ack.command_id, status }, 409);
    }

    return json({ command_id: ack.command_id, status });
  } catch (err) {
    console.error("device-command-ack failed", err);
    return json({ error: "Internal server error" }, 500);
  }
});
