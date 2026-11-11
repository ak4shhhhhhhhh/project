/*
# Owner check runs with the caller's own permissions

1. Modified Functions
- `is_active_owner()` now runs as the signed-in caller instead of the function owner.

2. Why
- The function only reads the caller's own profile row, which the profile policy already allows. Running as the caller removes an unnecessary elevated privilege.

3. Security
- No table or policy changes. Behaviour for owners and non-owners is unchanged.
*/

CREATE OR REPLACE FUNCTION public.is_active_owner()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
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
