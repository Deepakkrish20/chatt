-- ====================================================================
-- Chatt: One-Click Complete Database & Member Setup
-- Copy and run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/wxgatugyxopsznhlaodi/sql/new
-- ====================================================================

-- 1. Enable Cryptographic Extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- 2. Create Public Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  status TEXT DEFAULT 'online' CHECK (status IN ('online', 'offline', 'away')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 3. Create Conversations Table
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user2_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  last_message_text TEXT,
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT chk_different_participants CHECK (user1_id <> user2_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_conversations_unique_pair
  ON public.conversations (LEAST(user1_id, user2_id), GREATEST(user1_id, user2_id));

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants can view their conversations" ON public.conversations;
CREATE POLICY "Participants can view their conversations"
  ON public.conversations FOR SELECT
  TO authenticated
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

DROP POLICY IF EXISTS "Authenticated users can create 1:1 conversation" ON public.conversations;
CREATE POLICY "Authenticated users can create 1:1 conversation"
  ON public.conversations FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.uid() = user1_id OR auth.uid() = user2_id)
    AND user1_id <> user2_id
  );

DROP POLICY IF EXISTS "Participants can update their conversation" ON public.conversations;
CREATE POLICY "Participants can update their conversation"
  ON public.conversations FOR UPDATE
  TO authenticated
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- 4. Create Messages Table
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(trim(content)) > 0 AND char_length(content) <= 5000),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  read_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON public.messages(conversation_id, created_at ASC);
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants can view conversation messages" ON public.messages;
CREATE POLICY "Participants can view conversation messages"
  ON public.messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = messages.conversation_id
      AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Participants can insert messages" ON public.messages;
CREATE POLICY "Participants can insert messages"
  ON public.messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = messages.conversation_id
      AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Participants can update message read receipts" ON public.messages;
CREATE POLICY "Participants can update message read receipts"
  ON public.messages FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = messages.conversation_id
      AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
    )
  );

-- 5. RPC Functions & Triggers
CREATE OR REPLACE FUNCTION public.get_member_capacity()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  active_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO active_count FROM public.profiles;
  RETURN json_build_object(
    'active_members', active_count,
    'max_members', 10,
    'slots_remaining', GREATEST(0, 10 - active_count),
    'is_full', active_count >= 10
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_member_capacity() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_or_create_conversation(target_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  conv_id UUID;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;
  IF current_user_id = target_user_id THEN
    RAISE EXCEPTION 'Cannot create conversation with oneself.';
  END IF;

  SELECT id INTO conv_id
  FROM public.conversations
  WHERE (user1_id = current_user_id AND user2_id = target_user_id)
     OR (user1_id = target_user_id AND user2_id = current_user_id)
  LIMIT 1;

  IF conv_id IS NOT NULL THEN
    RETURN conv_id;
  END IF;

  INSERT INTO public.conversations (user1_id, user2_id, last_message_at)
  VALUES (LEAST(current_user_id, target_user_id), GREATEST(current_user_id, target_user_id), NOW())
  ON CONFLICT ((LEAST(user1_id, user2_id)), (GREATEST(user1_id, user2_id)))
  DO UPDATE SET updated_at = NOW()
  RETURNING id INTO conv_id;

  RETURN conv_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_or_create_conversation(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.handle_new_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.conversations
  SET last_message_text = NEW.content,
      last_message_at = NEW.created_at,
      updated_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_update_conversation_on_message ON public.messages;
CREATE TRIGGER tr_update_conversation_on_message
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_message();

CREATE OR REPLACE FUNCTION public.mark_conversation_read(target_conversation_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.messages
  SET read_at = NOW()
  WHERE conversation_id = target_conversation_id
    AND sender_id <> auth.uid()
    AND read_at IS NULL;
END;
$$;
GRANT EXECUTE ON FUNCTION public.mark_conversation_read(UUID) TO authenticated;

-- Enable Realtime
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'conversations') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'messages') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
END $$;

-- 6. Setup & Confirm Real Users (Krish & Jana)
DO $$
DECLARE
  k_id UUID;
  j_id UUID;
BEGIN
  -- Setup Krish (krishdeepak748@gmail.com)
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
        email_confirmed_at = NOW(),
        raw_user_meta_data = '{"displayName":"krish","username":"krish"}'::jsonb,
        updated_at = NOW()
    WHERE id = k_id;
  END IF;

  INSERT INTO public.profiles (id, username, display_name, status)
  VALUES (k_id, 'krish', 'krish', 'online')
  ON CONFLICT (id) DO UPDATE
  SET username = 'krish', display_name = 'krish', status = 'online', updated_at = NOW();

  -- Setup Jana (janathiru0101@gmail.com)
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
        email_confirmed_at = NOW(),
        raw_user_meta_data = '{"displayName":"Jana Thiru","username":"janathiru"}'::jsonb,
        updated_at = NOW()
    WHERE id = j_id;
  END IF;

  INSERT INTO public.profiles (id, username, display_name, status)
  VALUES (j_id, 'janathiru', 'Jana Thiru', 'online')
  ON CONFLICT (id) DO UPDATE
  SET username = 'janathiru', display_name = 'Jana Thiru', status = 'online', updated_at = NOW();
END $$;
