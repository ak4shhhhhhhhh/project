import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, X-Device-Id",
};

const MAX_BODY_BYTES = 2048;
const MAX_RAW_READING = 1024;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type DeviceCredentialRow = {
  secret_hash: string;
  devices: { revoked_at: string | null };
};

type TelemetryInput = {
  sequence: number;
  raw_reading: number;
  moisture_percent: number;
  pump_on: boolean;
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

function parseTelemetry(
  raw: unknown,
): { ok: true; value: TelemetryInput } | { ok: false; error: string } {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return { ok: false, error: "Body must be a JSON object." };
  }
  const body = raw as Record<string, unknown>;
  const { sequence, raw_reading, moisture_percent, pump_on } = body;

  if (typeof sequence !== "number" || !Number.isSafeInteger(sequence) || sequence < 0) {
    return { ok: false, error: "sequence must be a non-negative integer." };
  }
  if (
    typeof raw_reading !== "number" ||
    !Number.isInteger(raw_reading) ||
    raw_reading < 0 ||
    raw_reading > MAX_RAW_READING
  ) {
    return { ok: false, error: "raw_reading must be an integer from 0 to 1024." };
  }
  if (
    typeof moisture_percent !== "number" ||
    !Number.isFinite(moisture_percent) ||
    moisture_percent < 0 ||
    moisture_percent > 100
  ) {
    return { ok: false, error: "moisture_percent must be a number from 0 to 100." };
  }
  if (typeof pump_on !== "boolean") {
    return { ok: false, error: "pump_on must be true or false." };
  }

  return {
    ok: true,
    value: {
      sequence,
      raw_reading,
      moisture_percent: Math.round(moisture_percent * 100) / 100,
      pump_on,
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

    const parsed = parseTelemetry(parsedBody);
    if (!parsed.ok) return json({ error: parsed.error }, 400);
    const reading = parsed.value;

    const { data: outcome, error: ingestError } = await supabase.rpc("ingest_device_reading", {
      p_device_id: deviceId,
      p_sequence: reading.sequence,
      p_raw_reading: reading.raw_reading,
      p_moisture_percent: reading.moisture_percent,
      p_pump_on: reading.pump_on,
    });
    if (ingestError) throw ingestError;

    const nowIso = new Date().toISOString();

    const { error: expireError } = await supabase
      .from("commands")
      .update({ status: "expired" })
      .eq("device_id", deviceId)
      .in("status", ["pending", "received"])
      .lte("expires_at", nowIso);
    if (expireError) throw expireError;

    const { data: commands, error: commandsError } = await supabase
      .from("commands")
      .select("id, command_type, payload, status, expires_at")
      .eq("device_id", deviceId)
      .in("status", ["pending", "received"])
      .gt("expires_at", nowIso)
      .order("created_at", { ascending: true })
      .limit(10);
    if (commandsError) throw commandsError;

    return json({
      outcome,
      server_time: nowIso,
      commands: (commands ?? []).map((cmd) => ({
        id: cmd.id,
        command_type: cmd.command_type,
        payload: cmd.payload,
        status: cmd.status,
        expires_at: cmd.expires_at,
      })),
    });
  } catch (err) {
    console.error("device-telemetry failed", err);
    return json({ error: "Internal server error" }, 500);
  }
});
