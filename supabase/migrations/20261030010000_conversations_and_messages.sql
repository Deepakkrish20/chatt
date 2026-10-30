-- ====================================================================
-- Chatt — Module 5: Private Real-Time One-to-One Messaging Migration
-- ====================================================================

-- 1. Create Conversations Table
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user2_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  last_message_text TEXT,
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Ensure a conversation is strictly between two different members
  CONSTRAINT chk_different_participants CHECK (user1_id <> user2_id)
);

-- Unique index prevents duplicate conversations between the same pair regardless of argument order
CREATE UNIQUE INDEX IF NOT EXISTS idx_conversations_unique_pair
  ON public.conversations (LEAST(user1_id, user2_id), GREATEST(user1_id, user2_id));

-- Performance indexes for conversation lookups
CREATE INDEX IF NOT EXISTS idx_conversations_user1 ON public.conversations(user1_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user2 ON public.conversations(user2_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at ON public.conversations(last_message_at DESC);

-- 2. Create Messages Table
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(trim(content)) > 0 AND char_length(content) <= 5000),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  read_at TIMESTAMPTZ
);

-- Performance indexes for message queries
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON public.messages(conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON public.messages(conversation_id, read_at) WHERE read_at IS NULL;

-- 3. Row Level Security: Conversations Table
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- Only participants can view their conversations
DROP POLICY IF EXISTS "Participants can view their conversations" ON public.conversations;
CREATE POLICY "Participants can view their conversations"
  ON public.conversations FOR SELECT
  TO authenticated
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Only authenticated participants can create a conversation involving themselves
DROP POLICY IF EXISTS "Authenticated users can create 1:1 conversation" ON public.conversations;
CREATE POLICY "Authenticated users can create 1:1 conversation"
  ON public.conversations FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.uid() = user1_id OR auth.uid() = user2_id)
    AND user1_id <> user2_id
  );

-- Only participants can update their conversation
DROP POLICY IF EXISTS "Participants can update their conversation" ON public.conversations;
CREATE POLICY "Participants can update their conversation"
  ON public.conversations FOR UPDATE
  TO authenticated
  USING (auth.uid() = user1_id OR auth.uid() = user2_id)
  WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

-- 4. Row Level Security: Messages Table
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Only conversation participants can read messages
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

-- Only conversation participants can insert messages, and sender_id MUST equal auth.uid()
DROP POLICY IF EXISTS "Participants can insert messages with authenticated sender" ON public.messages;
CREATE POLICY "Participants can insert messages with authenticated sender"
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

-- Participants can mark received messages as read
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
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = messages.conversation_id
      AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
    )
  );

-- 5. Atomic RPC: Get or Create 1:1 Conversation
-- Ensures that concurrent attempts to create a conversation between User A and User B
-- resolve atomically to the exact same conversation ID without duplicating rows.
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
    RAISE EXCEPTION 'Authentication required.' USING ERRCODE = 'P0002';
  END IF;

  IF current_user_id = target_user_id THEN
    RAISE EXCEPTION 'Cannot create a private conversation with oneself.' USING ERRCODE = 'P0003';
  END IF;

  -- Validate that the target user exists
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = target_user_id) THEN
    RAISE EXCEPTION 'Target member does not exist.' USING ERRCODE = 'P0004';
  END IF;

  -- 1. Check if a conversation already exists
  SELECT id INTO conv_id
  FROM public.conversations
  WHERE (user1_id = current_user_id AND user2_id = target_user_id)
     OR (user1_id = target_user_id AND user2_id = current_user_id)
  LIMIT 1;

  IF conv_id IS NOT NULL THEN
    RETURN conv_id;
  END IF;

  -- 2. Insert new conversation with canonical ordering (user1_id < user2_id)
  INSERT INTO public.conversations (
    user1_id,
    user2_id,
    last_message_text,
    last_message_at
  )
  VALUES (
    LEAST(current_user_id, target_user_id),
    GREATEST(current_user_id, target_user_id),
    NULL,
    NOW()
  )
  ON CONFLICT ((LEAST(user1_id, user2_id)), (GREATEST(user1_id, user2_id)))
  DO UPDATE SET updated_at = NOW()
  RETURNING id INTO conv_id;

  RETURN conv_id;
END;
$$;

-- 6. Trigger: Synchronize Conversation Summary on New Message
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

-- 7. RPC: Mark Conversation Messages As Read
CREATE OR REPLACE FUNCTION public.mark_conversation_read(target_conversation_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID := auth.uid();
BEGIN
  IF current_user_id IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.messages
  SET read_at = NOW()
  WHERE conversation_id = target_conversation_id
    AND sender_id <> current_user_id
    AND read_at IS NULL;
END;
$$;

-- 8. Enable Realtime Replication
-- Allows authenticated mobile clients to receive live message broadcasts via Supabase Realtime
DO $$
BEGIN
  -- Add conversations table to publication if not already present
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'conversations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
  END IF;

  -- Add messages table to publication if not already present
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
END $$;
