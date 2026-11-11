/*
# Devices and device credentials

1. New Tables
- `devices`: each registered Smart Plant device. Stores the owner, a friendly name, creation time and an optional revoked time.
- `device_credentials`: the secret used by a device to prove its identity. Only a one-way fingerprint (SHA-256 hash) of the secret is stored, never the secret itself.

2. New Functions (server-only)
- `register_device(owner, name, secret_hash)`: creates a device and its first credential in one step.
- `rotate_device_credential(owner, device, secret_hash)`: retires the current credential and installs a new one in one step. The old secret stops working immediately.
- `revoke_device(owner, device)`: disables a device and its credential. The device can no longer send data or receive commands.
- All three verify that the acting user is an active owner and owns the device.

3. Security
- Row level security is enabled on both tables.
- The owner can read device details (name, status) but never the credential table.
- Credential hashes are not readable by any browser role.
- Write functions are callable only by the server (service role).

4. Important Notes
- Only one active credential can exist per device, enforced by a database index.
- Revoked devices cannot be reactivated; register a new device instead.
*/

CREATE TABLE IF NOT EXISTS public.devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 60),
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);

CREATE INDEX IF NOT EXISTS devices_owner_id_idx ON public.devices (owner_id);

CREATE TABLE IF NOT EXISTS public.device_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id uuid NOT NULL REFERENCES public.devices(id) ON DELETE CASCADE,
  secret_hash text NOT NULL CHECK (char_length(secret_hash) = 64),
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS device_credentials_one_active_idx
  ON public.device_credentials (device_id)
  WHERE revoked_at IS NULL;

ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_credentials ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.devices TO authenticated;
GRANT ALL ON public.devices TO service_role;
GRANT ALL ON public.device_credentials TO service_role;

DROP POLICY IF EXISTS "owner_select_devices" ON public.devices;
CREATE POLICY "owner_select_devices" ON public.devices
  FOR SELECT
  TO authenticated
  USING (public.is_active_owner() AND owner_id = auth.uid());

CREATE OR REPLACE FUNCTION public.register_device(
  p_owner_id uuid,
  p_name text,
  p_secret_hash text
)
RETURNS uuid
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_device_id uuid;
BEGIN
  PERFORM public.require_active_owner(p_owner_id);

  INSERT INTO public.devices (owner_id, name)
  VALUES (p_owner_id, p_name)
  RETURNING id INTO v_device_id;

  INSERT INTO public.device_credentials (device_id, secret_hash)
  VALUES (v_device_id, p_secret_hash);

  RETURN v_device_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.rotate_device_credential(
  p_owner_id uuid,
  p_device_id uuid,
  p_secret_hash text
)
RETURNS void
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  PERFORM public.require_active_owner(p_owner_id);

  IF NOT EXISTS (
    SELECT 1 FROM public.devices
    WHERE id = p_device_id AND owner_id = p_owner_id AND revoked_at IS NULL
  ) THEN
    RAISE EXCEPTION 'device not found' USING ERRCODE = 'P0002';
  END IF;

  UPDATE public.device_credentials
  SET revoked_at = now()
  WHERE device_id = p_device_id AND revoked_at IS NULL;

  INSERT INTO public.device_credentials (device_id, secret_hash)
  VALUES (p_device_id, p_secret_hash);
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_device(
  p_owner_id uuid,
  p_device_id uuid
)
RETURNS void
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  PERFORM public.require_active_owner(p_owner_id);

  IF NOT EXISTS (
    SELECT 1 FROM public.devices
    WHERE id = p_device_id AND owner_id = p_owner_id
  ) THEN
    RAISE EXCEPTION 'device not found' USING ERRCODE = 'P0002';
  END IF;

  UPDATE public.devices
  SET revoked_at = now()
  WHERE id = p_device_id AND revoked_at IS NULL;

  UPDATE public.device_credentials
  SET revoked_at = now()
  WHERE device_id = p_device_id AND revoked_at IS NULL;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.register_device(uuid, text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.rotate_device_credential(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.revoke_device(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.register_device(uuid, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.rotate_device_credential(uuid, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.revoke_device(uuid, uuid) TO service_role;
