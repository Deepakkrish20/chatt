-- ====================================================================
-- Chatt — Module: Chat Request & Accept System
-- Implements permission-based 1:1 messaging:
-- 1. chat_requests table with statuses: 'pending', 'accepted', 'declined'
-- 2. Strict unique pair constraint preventing duplicate/reverse requests
-- 3. Row Level Security policies for senders and receivers
-- 4. Atomic RPC functions: send_chat_request and respond_chat_request
-- 5. Realtime publication integration for instant mobile UI updates
-- ====================================================================

-- 1. Create chat_requests table
CREATE TABLE IF NOT EXISTS public.chat_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Cannot request oneself
  CONSTRAINT chk_different_request_participants CHECK (sender_id <> receiver_id)
);

-- Unique pair constraint ensures at most one active relationship record per pair of members
CREATE UNIQUE INDEX IF NOT EXISTS idx_chat_requests_unique_pair
  ON public.chat_requests (LEAST(sender_id, receiver_id), GREATEST(sender_id, receiver_id));

-- Indexes for lightning-fast queries
CREATE INDEX IF NOT EXISTS idx_chat_requests_sender ON public.chat_requests(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_requests_receiver ON public.chat_requests(receiver_id);
CREATE INDEX IF NOT EXISTS idx_chat_requests_status ON public.chat_requests(status);
CREATE INDEX IF NOT EXISTS idx_chat_requests_incoming_pending
  ON public.chat_requests(receiver_id, created_at DESC)
  WHERE status = 'pending';

-- 2. Row Level Security
ALTER TABLE public.chat_requests ENABLE ROW LEVEL SECURITY;

-- Senders and receivers can view their own requests
DROP POLICY IF EXISTS "Users can view their own chat requests" ON public.chat_requests;
CREATE POLICY "Users can view their own chat requests"
  ON public.chat_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Authenticated users can insert requests where they are the sender
DROP POLICY IF EXISTS "Users can insert requests as sender" ON public.chat_requests;
CREATE POLICY "Users can insert requests as sender"
  ON public.chat_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND sender_id <> receiver_id
  );

-- Receiver can accept or decline; sender can cancel or resend
DROP POLICY IF EXISTS "Participants can update their chat requests" ON public.chat_requests;
CREATE POLICY "Participants can update their chat requests"
  ON public.chat_requests FOR UPDATE
  TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id)
  WITH CHECK (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Participants can delete their chat requests
DROP POLICY IF EXISTS "Participants can delete their chat requests" ON public.chat_requests;
CREATE POLICY "Participants can delete their chat requests"
  ON public.chat_requests FOR DELETE
  TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- 3. Enable Realtime Replication
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_requests;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 4. Atomic RPC: send_chat_request
-- Sends a new request or reopens a previously declined request atomically
CREATE OR REPLACE FUNCTION public.send_chat_request(target_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  existing_record RECORD;
  result_id UUID;
BEGIN
  IF current_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Authentication required.');
  END IF;

  IF current_user_id = target_user_id THEN
    RETURN json_build_object('success', false, 'error', 'Cannot send a chat request to yourself.');
  END IF;

  -- Ensure target user profile exists
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = target_user_id) THEN
    RETURN json_build_object('success', false, 'error', 'Target user does not exist.');
  END IF;

  -- Check existing request between this pair
  SELECT * INTO existing_record
  FROM public.chat_requests
  WHERE (sender_id = current_user_id AND receiver_id = target_user_id)
     OR (sender_id = target_user_id AND receiver_id = current_user_id)
  LIMIT 1;

  IF existing_record.id IS NOT NULL THEN
    -- If already accepted
    IF existing_record.status = 'accepted' THEN
      RETURN json_build_object(
        'success', true,
        'request_id', existing_record.id,
        'status', 'accepted',
        'message', 'Already connected.'
      );
    END IF;

    -- If already pending from current user
    IF existing_record.status = 'pending' AND existing_record.sender_id = current_user_id THEN
      RETURN json_build_object(
        'success', true,
        'request_id', existing_record.id,
        'status', 'pending',
        'message', 'Request already sent and pending.'
      );
    END IF;

    -- If other user already sent a pending request to current user, auto-accept it!
    IF existing_record.status = 'pending' AND existing_record.sender_id = target_user_id THEN
      UPDATE public.chat_requests
      SET status = 'accepted', updated_at = NOW()
      WHERE id = existing_record.id
      RETURNING id INTO result_id;

      -- Create the conversation
      PERFORM public.get_or_create_conversation(target_user_id);

      RETURN json_build_object(
        'success', true,
        'request_id', result_id,
        'status', 'accepted',
        'message', 'Mutual request detected: Connection accepted!'
      );
    END IF;

    -- If declined, reset to pending with current user as sender
    UPDATE public.chat_requests
    SET sender_id = current_user_id,
        receiver_id = target_user_id,
        status = 'pending',
        updated_at = NOW()
    WHERE id = existing_record.id
    RETURNING id INTO result_id;

    RETURN json_build_object(
      'success', true,
      'request_id', result_id,
      'status', 'pending',
      'message', 'Chat request sent successfully.'
    );
  END IF;

  -- Fresh request insert
  INSERT INTO public.chat_requests (sender_id, receiver_id, status)
  VALUES (current_user_id, target_user_id, 'pending')
  RETURNING id INTO result_id;

  RETURN json_build_object(
    'success', true,
    'request_id', result_id,
    'status', 'pending',
    'message', 'Chat request sent successfully.'
  );
END;
$$;

-- 5. Atomic RPC: respond_chat_request
-- Allows receiver to accept or decline, and immediately provisions 1:1 conversation upon acceptance
CREATE OR REPLACE FUNCTION public.respond_chat_request(
  request_id UUID,
  new_status TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  req_record RECORD;
  conv_id UUID := NULL;
BEGIN
  IF current_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Authentication required.');
  END IF;

  IF new_status NOT IN ('accepted', 'declined') THEN
    RETURN json_build_object('success', false, 'error', 'Invalid status. Must be accepted or declined.');
  END IF;

  -- Fetch request and verify receiver
  SELECT * INTO req_record
  FROM public.chat_requests
  WHERE id = request_id;

  IF req_record.id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Chat request not found.');
  END IF;

  IF req_record.receiver_id <> current_user_id THEN
    RETURN json_build_object('success', false, 'error', 'You are not authorized to respond to this request.');
  END IF;

  -- Update status
  UPDATE public.chat_requests
  SET status = new_status,
      updated_at = NOW()
  WHERE id = request_id;

  -- If accepted, ensure the conversation exists
  IF new_status = 'accepted' THEN
    conv_id := public.get_or_create_conversation(req_record.sender_id);
  END IF;

  RETURN json_build_object(
    'success', true,
    'status', new_status,
    'conversation_id', conv_id
  );
END;
$$;

-- Grant permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.send_chat_request(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.respond_chat_request(UUID, TEXT) TO authenticated;
