-- Migration: Add atomic disconnect_chat_connection and cancel_chat_request RPCs

-- 1. Atomic RPC: disconnect_chat_connection
-- Removes connection or pending request between current user and target user, and purges shared conversation
CREATE OR REPLACE FUNCTION public.disconnect_chat_connection(target_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  deleted_requests INT := 0;
  deleted_convs INT := 0;
BEGIN
  IF current_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Authentication required.');
  END IF;

  -- Delete from chat_requests
  DELETE FROM public.chat_requests
  WHERE (sender_id = current_user_id AND receiver_id = target_user_id)
     OR (sender_id = target_user_id AND receiver_id = current_user_id);
  GET DIAGNOSTICS deleted_requests = ROW_COUNT;

  -- Delete from conversations
  DELETE FROM public.conversations
  WHERE (user1_id = current_user_id AND user2_id = target_user_id)
     OR (user1_id = target_user_id AND user2_id = current_user_id);
  GET DIAGNOSTICS deleted_convs = ROW_COUNT;

  RETURN json_build_object(
    'success', true,
    'message', 'Connection removed successfully.',
    'deleted_requests', deleted_requests,
    'deleted_conversations', deleted_convs
  );
END;
$$;

-- Grant execution permission
GRANT EXECUTE ON FUNCTION public.disconnect_chat_connection(UUID) TO authenticated;
