import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DEFAULT_TTL_SECONDS = 300;
const MIN_TTL_SECONDS = 30;
const MAX_TTL_SECONDS = 86400;
const DEFAULT_CALIBRATION = { air_value: 1024, dry_value: 950, moist_value: 422 };

type CommandType = "pump_on" | "pump_off" | "sync_config";

type CommandInput = {
  deviceId: string;
  commandType: CommandType;
  ttlSeconds: number;
  payload: Record<string, unknown>;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isCalibrationValue(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 1024;
}

function parseCalibration(
  raw: unknown,
): { ok: true; value: typeof DEFAULT_CALIBRATION } | { ok: false; error: string } {
  if (raw === undefined || raw === null) return { ok: true, value: DEFAULT_CALIBRATION };
  if (typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, error: "calibration must be an object." };
  }
  const cal = raw as Record<string, unknown>;
  const { airValue, dryValue, moistValue } = cal;
  if (!isCalibrationValue(airValue) || !isCalibrationValue(dryValue) || !isCalibrationValue(moistValue)) {
    return { ok: false, error: "Calibration values must be whole numbers from 0 to 1024." };
  }
  if (!(airValue >= dryValue && dryValue > moistValue)) {
    return { ok: false, error: "Calibration must satisfy air >= dry > moist." };
  }
  return {
    ok: true,
    value: { air_value: airValue, dry_value: dryValue, moist_value: moistValue },
  };
}

function parseInput(raw: unknown): { ok: true; value: CommandInput } | { ok: false; error: string } {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return { ok: false, error: "Body must be a JSON object." };
  }
  const body = raw as Record<string, unknown>;
  const { deviceId, commandType, ttlSeconds, calibration } = body;

  if (typeof deviceId !== "string" || !UUID_PATTERN.test(deviceId)) {
    return { ok: false, error: "deviceId must be a valid device ID." };
  }
  if (commandType !== "pump_on" && commandType !== "pump_off" && commandType !== "sync_config") {
    return { ok: false, error: "commandType must be pump_on, pump_off or sync_config." };
  }

  let ttl = DEFAULT_TTL_SECONDS;
  if (ttlSeconds !== undefined) {
    if (
      typeof ttlSeconds !== "number" ||
      !Number.isInteger(ttlSeconds) ||
      ttlSeconds < MIN_TTL_SECONDS ||
      ttlSeconds > MAX_TTL_SECONDS
    ) {
      return {
        ok: false,
        error: `ttlSeconds must be a whole number from ${MIN_TTL_SECONDS} to ${MAX_TTL_SECONDS}.`,
      };
    }
    ttl = ttlSeconds;
  }

  if (commandType === "sync_config") {
    const cal = parseCalibration(calibration);
    if (!cal.ok) return cal;
    return {
      ok: true,
      value: { deviceId, commandType, ttlSeconds: ttl, payload: { ...cal.value } },
    };
  }

  return { ok: true, value: { deviceId, commandType, ttlSeconds: ttl, payload: {} } };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "Sign in required" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const adminClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: userData, error: userError } = await anonClient.auth.getUser(token);
    if (userError || !userData.user) return json({ error: "Sign in required" }, 401);
    const ownerId = userData.user.id;

    const { data: isOwner, error: ownerError } = await anonClient.rpc("is_active_owner");
    if (ownerError) throw ownerError;
    if (isOwner !== true) return json({ error: "Owner access required" }, 403);

    const parsed = parseInput(await req.json().catch(() => null));
    if (!parsed.ok) return json({ error: parsed.error }, 400);
    const input = parsed.value;

    const { data: device, error: deviceError } = await adminClient
      .from("devices")
      .select("id")
      .eq("id", input.deviceId)
      .eq("owner_id", ownerId)
      .is("revoked_at", null)
      .maybeSingle();
    if (deviceError) throw deviceError;
    if (!device) return json({ error: "Device not found" }, 404);

    const expiresAt = new Date(Date.now() + input.ttlSeconds * 1000).toISOString();
    const { data: command, error: insertError } = await adminClient
      .from("commands")
      .insert({
        device_id: input.deviceId,
        requested_by: ownerId,
        command_type: input.commandType,
        payload: input.payload,
        expires_at: expiresAt,
      })
      .select("id, device_id, command_type, payload, status, created_at, expires_at")
      .single();
    if (insertError) throw insertError;

    return json({ command }, 201);
  } catch (err) {
    console.error("owner-commands failed", err);
    return json({ error: "Internal server error" }, 500);
  }
});
