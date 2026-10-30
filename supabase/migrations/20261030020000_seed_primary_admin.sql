-- ====================================================================
-- Chatt — Primary Member Seed Migration
-- Email: krishdeepak748@gmail.com
-- ====================================================================

DO $$
DECLARE
  seed_user_id UUID;
  seed_email TEXT := 'krishdeepak748@gmail.com';
  seed_password TEXT := 'DeepakKrish@12345';
  seed_name TEXT := 'Deepak Krish';
  seed_user TEXT := 'deepakkrish';
BEGIN
  -- 1. Check if user already exists
  SELECT id INTO seed_user_id
  FROM auth.users
  WHERE email = seed_email;

  -- 2. If user does not exist, insert into auth.users with encrypted bcrypt password
  IF seed_user_id IS NULL THEN
    seed_user_id := gen_random_uuid();

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
      seed_user_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      seed_email,
      crypt(seed_password, gen_salt('bf')),
      NOW(),
      '{"provider": "email", "providers": ["email"]}'::jsonb,
      json_build_object('displayName', seed_name, 'username', seed_user)::jsonb,
      NOW(),
      NOW()
    );
  END IF;

  -- 3. Ensure profile exists in public.profiles
  INSERT INTO public.profiles (id, username, display_name, status)
  VALUES (seed_user_id, seed_user, seed_name, 'online')
  ON CONFLICT (id) DO UPDATE
  SET username = seed_user,
      display_name = seed_name,
      updated_at = NOW();

END $$;
