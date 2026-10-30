-- ====================================================================
-- Chatt — Module 4: Authentication & 10-Member Limit Migration
-- ====================================================================

-- 1. Create Public Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  status TEXT DEFAULT 'online' CHECK (status IN ('online', 'offline', 'away')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for username lookups
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);

-- 2. Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Allow registered/authenticated members to view profiles (required for 1:1 messaging)
DROP POLICY IF EXISTS "Profiles are viewable by authenticated members" ON public.profiles;
CREATE POLICY "Profiles are viewable by authenticated members"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

-- Allow anon to read profile count / public metadata for registration check
DROP POLICY IF EXISTS "Public can view basic profiles for slot verification" ON public.profiles;
CREATE POLICY "Public can view basic profiles for slot verification"
  ON public.profiles FOR SELECT
  TO anon
  USING (true);

-- Allow members to update only their own profile
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 3. Atomic Server-Side 10-Member Limit Enforcement
-- This function runs BEFORE an account is inserted into auth.users.
-- It locks using an advisory transaction lock to guarantee atomic concurrency
-- protection against race conditions.
CREATE OR REPLACE FUNCTION public.check_registration_member_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_count INTEGER;
  max_limit CONSTANT INTEGER := 10;
BEGIN
  -- Acquire an advisory transaction lock scoped to the member limit
  -- Ensures concurrent signups are serialized and cannot exceed 10.
  PERFORM pg_advisory_xact_lock(hashtext('chatt_registration_limit_lock'));

  -- Count existing registered profiles
  SELECT COUNT(*) INTO current_count FROM public.profiles;

  IF current_count >= max_limit THEN
    RAISE EXCEPTION 'Registration closed: maximum limit of % members reached.', max_limit
      USING ERRCODE = 'P0001',
            HINT = 'This private network enforces a hard limit of 10 registered members.';
  END IF;

  RETURN NEW;
END;
$$;

-- Attach trigger to auth.users BEFORE INSERT
DROP TRIGGER IF EXISTS tr_enforce_10_member_limit ON auth.users;
CREATE TRIGGER tr_enforce_10_member_limit
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.check_registration_member_limit();

-- 4. Automatic Profile Creation on Signup
CREATE OR REPLACE FUNCTION public.handle_new_member_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  raw_name TEXT;
  raw_user TEXT;
BEGIN
  raw_name := COALESCE(NEW.raw_user_meta_data->>'displayName', NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1));
  raw_user := COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1));

  -- Append random suffix if username collision exists
  IF EXISTS (SELECT 1 FROM public.profiles WHERE username = raw_user) THEN
    raw_user := raw_user || '_' || substr(NEW.id::text, 1, 4);
  END IF;

  INSERT INTO public.profiles (id, username, display_name)
  VALUES (NEW.id, raw_user, raw_name);

  RETURN NEW;
END;
$$;

-- Attach trigger to auth.users AFTER INSERT
DROP TRIGGER IF EXISTS tr_on_auth_user_created ON auth.users;
CREATE TRIGGER tr_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_member_signup();

-- 5. Public RPC: Get Member Capacity
-- Allows both anonymous visitors and authenticated users to query network capacity.
CREATE OR REPLACE FUNCTION public.get_member_capacity()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  active_count INTEGER;
  max_capacity CONSTANT INTEGER := 10;
BEGIN
  SELECT COUNT(*) INTO active_count FROM public.profiles;

  RETURN json_build_object(
    'active_members', active_count,
    'max_members', max_capacity,
    'slots_remaining', GREATEST(0, max_capacity - active_count),
    'is_full', active_count >= max_capacity
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_member_capacity() TO anon, authenticated;
