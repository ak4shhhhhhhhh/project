import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_NAME_LENGTH = 60;
const SECRET_PREFIX = "vdt_";

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

function generateDeviceSecret(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  const encoded = btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return SECRET_PREFIX + encoded;
}

type Action = "register" | "rotate" | "revoke";

type ActionInput =
  | { action: "register"; name: string }
  | { action: Action; deviceId: string };

function parseInput(raw: unknown): { ok: true; value: ActionInput } | { ok: false; error: string } {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return { ok: false, error: "Body must be a JSON object." };
  }
  const body = raw as Record<string, unknown>;

  if (body.action === "register") {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (name.length < 1 || name.length > MAX_NAME_LENGTH) {
      return { ok: false, error: `Device name must be 1 to ${MAX_NAME_LENGTH} characters.` };
    }
    return { ok: true, value: { action: "register", name } };
  }

  if (body.action === "rotate" || body.action === "revoke") {
    if (typeof body.deviceId !== "string" || !UUID_PATTERN.test(body.deviceId)) {
      return { ok: false, error: "deviceId must be a valid device ID." };
    }
    return { ok: true, value: { action: body.action, deviceId: body.deviceId } };
  }

  return { ok: false, error: "action must be register, rotate or revoke." };
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

    if (input.action === "register") {
      const secret = generateDeviceSecret();
      const secretHash = await sha256Hex(secret);
      const { data: deviceId, error } = await adminClient.rpc("register_device", {
        p_owner_id: ownerId,
        p_name: input.name,
        p_secret_hash: secretHash,
      });
      if (error) throw error;
      return json({ device_id: deviceId, name: input.name, secret }, 201);
    }

    if (input.action === "rotate") {
      const secret = generateDeviceSecret();
      const secretHash = await sha256Hex(secret);
      const { error } = await adminClient.rpc("rotate_device_credential", {
        p_owner_id: ownerId,
        p_device_id: input.deviceId,
        p_secret_hash: secretHash,
      });
      if (error) throw error;
      return json({ device_id: input.deviceId, secret });
    }

    const { error } = await adminClient.rpc("revoke_device", {
      p_owner_id: ownerId,
      p_device_id: input.deviceId,
    });
    if (error) throw error;
    return json({ device_id: input.deviceId, revoked: true });
  } catch (err) {
    const code = (err as { code?: string })?.code;
    if (code === "P0002") return json({ error: "Device not found" }, 404);
    if (code === "42501") return json({ error: "Owner access required" }, 403);
    console.error("owner-devices failed", err);
    return json({ error: "Internal server error" }, 500);
  }
});
