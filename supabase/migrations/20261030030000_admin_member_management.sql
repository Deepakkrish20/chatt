-- ====================================================================
-- Chatt — Module: Admin Member Management & Pre-Seeded Accounts
-- Allows Admin to provision member credentials with zero email limits
-- ====================================================================

-- 1. Function: Admin Create Member
-- Securely creates a user account with pre-confirmed status and profile
CREATE OR REPLACE FUNCTION public.admin_create_member(
  member_username TEXT,
  member_display_name TEXT,
  member_password TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  current_count INTEGER;
  new_user_id UUID := gen_random_uuid();
  clean_user TEXT := lower(trim(member_username));
  clean_name TEXT := trim(member_display_name);
  clean_email TEXT;
BEGIN
  -- Enforce 10-member hard cap
  SELECT COUNT(*) INTO current_count FROM public.profiles;
  IF current_count >= 10 THEN
    RETURN json_build_object('success', false, 'error', 'Network is at maximum capacity (10/10 members).');
  END IF;

  -- Validate username
  IF length(clean_user) < 3 THEN
    RETURN json_build_object('success', false, 'error', 'Username must be at least 3 characters.');
  END IF;

  IF EXISTS (SELECT 1 FROM public.profiles WHERE lower(username) = clean_user) THEN
    RETURN json_build_object('success', false, 'error', 'Username already taken.');
  END IF;

  IF length(member_password) < 6 THEN
    RETURN json_build_object('success', false, 'error', 'Password must be at least 6 characters.');
  END IF;

  clean_email := clean_user || '@chatt.internal';

  -- Create account in auth.users with pre-confirmed email
  INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
  )
  VALUES (
    new_user_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    clean_email,
    crypt(member_password, gen_salt('bf')),
    NOW(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    json_build_object('displayName', clean_name, 'username', clean_user)::jsonb,
    NOW(),
    NOW()
  );

  -- Create profile in public.profiles
  INSERT INTO public.profiles (id, username, display_name, status)
  VALUES (new_user_id, clean_user, clean_name, 'offline')
  ON CONFLICT (id) DO UPDATE
  SET username = clean_user,
      display_name = clean_name,
      updated_at = NOW();

  RETURN json_build_object(
    'success', true,
    'user_id', new_user_id,
    'username', clean_user,
    'email', clean_email
  );
END;
$$;

-- 2. Pre-Seed Active Test Accounts
-- Seeds Deepak (Admin), Jana, Alex, and Sarah for instant 1:1 messaging tests
DO $$
DECLARE
  u_id UUID;
BEGIN
  -- Account 1: Deepak Krish (Admin)
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'krishdeepak748@gmail.com') THEN
    u_id := gen_random_uuid();
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES (u_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'krishdeepak748@gmail.com', crypt('DeepakKrish@12345', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}'::jsonb, '{"displayName":"Deepak Krish","username":"deepak"}'::jsonb, NOW(), NOW());
    INSERT INTO public.profiles (id, username, display_name, status) VALUES (u_id, 'deepak', 'Deepak Krish (Admin)', 'online') ON CONFLICT (id) DO NOTHING;
  END IF;

  -- Account 2: Jana Thiru
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'jana@chatt.internal') THEN
    u_id := gen_random_uuid();
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES (u_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'jana@chatt.internal', crypt('Jana@12345', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}'::jsonb, '{"displayName":"Jana Thiru","username":"jana"}'::jsonb, NOW(), NOW());
    INSERT INTO public.profiles (id, username, display_name, status) VALUES (u_id, 'jana', 'Jana Thiru', 'online') ON CONFLICT (id) DO NOTHING;
  END IF;

  -- Account 3: Alex Rivera
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'alex@chatt.internal') THEN
    u_id := gen_random_uuid();
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES (u_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'alex@chatt.internal', crypt('Alex@12345', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}'::jsonb, '{"displayName":"Alex Rivera","username":"alex"}'::jsonb, NOW(), NOW());
    INSERT INTO public.profiles (id, username, display_name, status) VALUES (u_id, 'alex', 'Alex Rivera', 'offline') ON CONFLICT (id) DO NOTHING;
  END IF;

  -- Account 4: Sarah Chen
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'sarah@chatt.internal') THEN
    u_id := gen_random_uuid();
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES (u_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'sarah@chatt.internal', crypt('Sarah@12345', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}'::jsonb, '{"displayName":"Sarah Chen","username":"sarah"}'::jsonb, NOW(), NOW());
    INSERT INTO public.profiles (id, username, display_name, status) VALUES (u_id, 'sarah', 'Sarah Chen', 'offline') ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;
