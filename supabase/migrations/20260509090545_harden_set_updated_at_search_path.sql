-- Lock down set_updated_at() to an empty search_path so unqualified
-- name lookups can't be hijacked by a malicious schema injection.
-- Supabase advisor lint 0011 (function_search_path_mutable).
-- pg_catalog functions like NOW() resolve regardless of search_path.

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;
