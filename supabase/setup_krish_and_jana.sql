-- ====================================================================
-- Chatt: Real Member Setup (Krish & Jana)
-- Zero Mock Data — Direct Supabase Auth & Real Profiles
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/wxgatugyxopsznhlaodi/sql/new
-- ====================================================================

-- Ensure pgcrypto extension is available for secure password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- Remove legacy mock accounts if any were inserted
DELETE FROM auth.users WHERE email IN ('jana@chatt.internal', 'alex@chatt.internal', 'sarah@chatt.internal');
DELETE FROM public.profiles WHERE username IN ('alex', 'sarah');

DO $$
DECLARE
  k_id UUID;
  j_id UUID;
BEGIN
  -- -------------------------------------------------------------
  -- 1. Krish (Admin)
  -- Email: krishdeepak748@gmail.com
  -- Password: DeepakKrish@12345
  -- Display Name: krish
  -- Username: krish
  -- -------------------------------------------------------------
  SELECT id INTO k_id FROM auth.users WHERE email = 'krishdeepak748@gmail.com' LIMIT 1;
  
  IF k_id IS NULL THEN
    k_id := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) VALUES (
      k_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      'krishdeepak748@gmail.com', crypt('DeepakKrish@12345', gen_salt('bf')), NOW(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"displayName":"krish","username":"krish"}'::jsonb,
      NOW(), NOW()
    );
  ELSE
    UPDATE auth.users
    SET encrypted_password = crypt('DeepakKrish@12345', gen_salt('bf')),
        email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
        raw_user_meta_data = '{"displayName":"krish","username":"krish"}'::jsonb,
        updated_at = NOW()
    WHERE id = k_id;
  END IF;

  -- Free username 'krish' if taken by an old record
  UPDATE public.profiles
  SET username = 'krish_old_' || substr(id::text, 1, 4)
  WHERE username = 'krish' AND id <> k_id;

  INSERT INTO public.profiles (id, username, display_name, status)
  VALUES (k_id, 'krish', 'krish', 'online')
  ON CONFLICT (id) DO UPDATE
  SET username = 'krish',
      display_name = 'krish',
      status = 'online',
      updated_at = NOW();

  -- -------------------------------------------------------------
  -- 2. Jana Thiru
  -- Email: janathiru0101@gmail.com
  -- Password: janathiru@123
  -- Display Name: Jana Thiru
  -- Username: janathiru
  -- -------------------------------------------------------------
  SELECT id INTO j_id FROM auth.users WHERE email = 'janathiru0101@gmail.com' LIMIT 1;
  
  IF j_id IS NULL THEN
    j_id := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) VALUES (
      j_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      'janathiru0101@gmail.com', crypt('janathiru@123', gen_salt('bf')), NOW(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"displayName":"Jana Thiru","username":"janathiru"}'::jsonb,
      NOW(), NOW()
    );
  ELSE
    UPDATE auth.users
    SET encrypted_password = crypt('janathiru@123', gen_salt('bf')),
        email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
        raw_user_meta_data = '{"displayName":"Jana Thiru","username":"janathiru"}'::jsonb,
        updated_at = NOW()
    WHERE id = j_id;
  END IF;

  -- Free username 'janathiru' if taken by an old record
  UPDATE public.profiles
  SET username = 'janathiru_old_' || substr(id::text, 1, 4)
  WHERE username = 'janathiru' AND id <> j_id;

  INSERT INTO public.profiles (id, username, display_name, status)
  VALUES (j_id, 'janathiru', 'Jana Thiru', 'online')
  ON CONFLICT (id) DO UPDATE
  SET username = 'janathiru',
      display_name = 'Jana Thiru',
      status = 'online',
      updated_at = NOW();

END $$;
