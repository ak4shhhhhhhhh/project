/*
# Telemetry readings, latest device state and command lifecycle

1. New Tables
- `readings`: history of every accepted soil sample. Stores the raw sensor value (0 to 1024), the moisture percentage (0 to 100), the pump state and a per-device sequence number.
- `device_states`: one row per device holding the most recent reading. It only moves forward, so an old or duplicate sample can never overwrite newer information.
- `commands`: instructions sent from the owner to a device. Status flows pending, received, then executed or failed. Commands that run past their expiry become expired.

2. New Functions (server-only)
- `ingest_device_reading(...)`: stores a reading once per sequence number, reports duplicates, and updates the latest state only when the sequence is newer.
- `acknowledge_command(...)`: records the device's receipt or execution report. It checks that the command belongs to the reporting device, that it has not expired, and that it is not already finished.

3. Security
- Row level security is enabled on all three tables.
- The owner can read readings, latest states and commands for their own devices. No browser role can write to them.
- Writes happen only through server functions that the device and owner endpoints call after authentication.

4. Important Notes
- A command being delivered is not treated as done. Only the device's execution report marks it executed or failed.
- Receipt and execution are separate acknowledgements. Execution reported without a prior receipt is accepted and the receipt time is recorded at that moment.
- Duplicate readings and duplicate acknowledgements return the current state without changing data.
*/

CREATE TABLE IF NOT EXISTS public.readings (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  device_id uuid NOT NULL REFERENCES public.devices(id) ON DELETE CASCADE,
  sequence bigint NOT NULL CHECK (sequence >= 0),
  raw_reading integer NOT NULL CHECK (raw_reading BETWEEN 0 AND 1024),
  moisture_percent numeric(5,2) NOT NULL CHECK (moisture_percent BETWEEN 0 AND 100),
  pump_on boolean NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT readings_device_sequence_unique UNIQUE (device_id, sequence)
);

CREATE INDEX IF NOT EXISTS readings_device_recorded_idx
  ON public.readings (device_id, recorded_at DESC);

CREATE TABLE IF NOT EXISTS public.device_states (
  device_id uuid PRIMARY KEY REFERENCES public.devices(id) ON DELETE CASCADE,
  last_sequence bigint NOT NULL CHECK (last_sequence >= 0),
  raw_reading integer NOT NULL CHECK (raw_reading BETWEEN 0 AND 1024),
  moisture_percent numeric(5,2) NOT NULL CHECK (moisture_percent BETWEEN 0 AND 100),
  pump_on boolean NOT NULL,
  reported_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.commands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id uuid NOT NULL REFERENCES public.devices(id) ON DELETE CASCADE,
  requested_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  command_type text NOT NULL CHECK (command_type IN ('pump_on', 'pump_off', 'sync_config')),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(payload) = 'object'),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'received', 'executed', 'failed', 'expired')),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  received_at timestamptz,
  finished_at timestamptz,
  failure_reason text CHECK (char_length(failure_reason) <= 200),
  CONSTRAINT commands_expiry_after_creation CHECK (expires_at > created_at),
  CONSTRAINT commands_finished_has_time CHECK (
    status NOT IN ('executed', 'failed') OR finished_at IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS commands_device_open_idx
  ON public.commands (device_id, created_at)
  WHERE status IN ('pending', 'received');

ALTER TABLE public.readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commands ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.readings TO authenticated;
GRANT SELECT ON public.device_states TO authenticated;
GRANT SELECT ON public.commands TO authenticated;
GRANT ALL ON public.readings TO service_role;
GRANT ALL ON public.device_states TO service_role;
GRANT ALL ON public.commands TO service_role;

DROP POLICY IF EXISTS "owner_select_readings" ON public.readings;
CREATE POLICY "owner_select_readings" ON public.readings
  FOR SELECT
  TO authenticated
  USING (
    public.is_active_owner()
    AND EXISTS (
      SELECT 1 FROM public.devices AS d
      WHERE d.id = readings.device_id AND d.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "owner_select_device_states" ON public.device_states;
CREATE POLICY "owner_select_device_states" ON public.device_states
  FOR SELECT
  TO authenticated
  USING (
    public.is_active_owner()
    AND EXISTS (
      SELECT 1 FROM public.devices AS d
      WHERE d.id = device_states.device_id AND d.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "owner_select_commands" ON public.commands;
CREATE POLICY "owner_select_commands" ON public.commands
  FOR SELECT
  TO authenticated
  USING (
    public.is_active_owner()
    AND EXISTS (
      SELECT 1 FROM public.devices AS d
      WHERE d.id = commands.device_id AND d.owner_id = auth.uid()
    )
  );

CREATE OR REPLACE FUNCTION public.ingest_device_reading(
  p_device_id uuid,
  p_sequence bigint,
  p_raw_reading integer,
  p_moisture_percent numeric,
  p_pump_on boolean
)
RETURNS text
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_inserted integer;
  v_state_updated integer;
BEGIN
  INSERT INTO public.readings (device_id, sequence, raw_reading, moisture_percent, pump_on)
  VALUES (p_device_id, p_sequence, p_raw_reading, p_moisture_percent, p_pump_on)
  ON CONFLICT (device_id, sequence) DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  IF v_inserted = 0 THEN
    RETURN 'duplicate';
  END IF;

  INSERT INTO public.device_states (device_id, last_sequence, raw_reading, moisture_percent, pump_on, reported_at)
  VALUES (p_device_id, p_sequence, p_raw_reading, p_moisture_percent, p_pump_on, now())
  ON CONFLICT (device_id) DO UPDATE SET
    last_sequence = EXCLUDED.last_sequence,
    raw_reading = EXCLUDED.raw_reading,
    moisture_percent = EXCLUDED.moisture_percent,
    pump_on = EXCLUDED.pump_on,
    reported_at = EXCLUDED.reported_at
  WHERE public.device_states.last_sequence < EXCLUDED.last_sequence;

  GET DIAGNOSTICS v_state_updated = ROW_COUNT;
  IF v_state_updated = 0 THEN
    RETURN 'stored_out_of_order';
  END IF;

  RETURN 'accepted';
END;
$$;

CREATE OR REPLACE FUNCTION public.acknowledge_command(
  p_device_id uuid,
  p_command_id uuid,
  p_stage text,
  p_outcome text,
  p_failure_reason text
)
RETURNS text
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_cmd public.commands%ROWTYPE;
BEGIN
  SELECT * INTO v_cmd
  FROM public.commands
  WHERE id = p_command_id AND device_id = p_device_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN 'not_found';
  END IF;

  IF v_cmd.status IN ('pending', 'received') AND v_cmd.expires_at <= now() THEN
    UPDATE public.commands SET status = 'expired' WHERE id = v_cmd.id;
    RETURN 'expired';
  END IF;

  IF p_stage = 'receipt' THEN
    IF v_cmd.status = 'pending' THEN
      UPDATE public.commands
      SET status = 'received', received_at = now()
      WHERE id = v_cmd.id;
      RETURN 'received';
    END IF;
    RETURN v_cmd.status;
  END IF;

  IF v_cmd.status IN ('pending', 'received') THEN
    UPDATE public.commands
    SET status = p_outcome,
        received_at = COALESCE(received_at, now()),
        finished_at = now(),
        failure_reason = CASE WHEN p_outcome = 'failed' THEN p_failure_reason ELSE NULL END
    WHERE id = v_cmd.id;
    RETURN p_outcome;
  END IF;

  RETURN v_cmd.status;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.ingest_device_reading(uuid, bigint, integer, numeric, boolean) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.acknowledge_command(uuid, uuid, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ingest_device_reading(uuid, bigint, integer, numeric, boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.acknowledge_command(uuid, uuid, text, text, text) TO service_role;
