/*
# Profiles and owner-only access

1. New Tables
- `profiles`: one row per account. `id` matches the sign-in account, `email` for display, `is_owner` marks the single owner, `is_pending` blocks an account until the owner approves it.

2. New Functions
- `is_active_owner()`: returns true only when the signed-in user is an owner and is not pending. Every policy that exposes device data uses it.
- `handle_new_user()`: runs automatically after each sign-up. The first account ever created becomes the approved owner. Every later account is created as pending.
- `require_active_owner(uuid)`: raises an error unless the given user is an active owner. Used by server-side device functions.

3. Security
- Row level security is enabled on `profiles`.
- Signed-in users can read only their own profile row.
- No client role can insert, update or delete profiles, so nobody can grant themselves owner or approval.
- Helper functions are not callable by anonymous visitors.

4. Important Notes
- Public sign-up cannot create a second owner once the first owner exists.
- The owner approves pending accounts by setting `is_pending` to false on that profile.
*/

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL DEFAULT '',
  is_owner boolean NOT NULL DEFAULT false,
  is_pending boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT profiles_owner_not_pending CHECK (NOT (is_owner AND is_pending))
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_active_owner()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles AS p
    WHERE p.id = auth.uid()
      AND p.is_owner
      AND NOT p.is_pending
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_active_owner() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_active_owner() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.require_active_owner(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
STABLE
SET search_path = ''
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles AS p
    WHERE p.id = p_user_id
      AND p.is_owner
      AND NOT p.is_pending
  ) THEN
    RAISE EXCEPTION 'owner access required' USING ERRCODE = '42501';
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.require_active_owner(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.require_active_owner(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_has_owner boolean;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('profiles_owner_bootstrap'));

  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE is_owner) INTO v_has_owner;

  INSERT INTO public.profiles (id, email, is_owner, is_pending)
  VALUES (NEW.id, COALESCE(NEW.email, ''), NOT v_has_owner, v_has_owner)
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

GRANT SELECT ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

DROP POLICY IF EXISTS "select_own_profile" ON public.profiles;
CREATE POLICY "select_own_profile" ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);
