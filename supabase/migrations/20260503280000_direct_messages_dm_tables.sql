-- Direct messaging (1:1): tables expected by /messages and profile "Message".
-- 404 on /rest/v1/conversations means these tables were never created on the project.

-- ─── conversations ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  last_message_content text,
  last_message_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conversations_created_by ON public.conversations (created_by);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at ON public.conversations (last_message_at DESC NULLS LAST);

-- ─── conversation_participants ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.conversation_participants (
  conversation_id uuid NOT NULL REFERENCES public.conversations (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  is_read boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_conversation_participants_user ON public.conversation_participants (user_id);

-- ─── direct_messages ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.direct_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations (id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  content text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_direct_messages_conversation ON public.direct_messages (conversation_id);
CREATE INDEX IF NOT EXISTS idx_direct_messages_created_at ON public.direct_messages (conversation_id, created_at);

-- Membership check without RLS recursion (policies must not subquery conversation_participants directly).
CREATE OR REPLACE FUNCTION public.dm_is_conversation_participant(p_conversation_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = p_conversation_id AND cp.user_id = p_user_id
  );
$$;

REVOKE ALL ON FUNCTION public.dm_is_conversation_participant(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.dm_is_conversation_participant(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.dm_is_conversation_participant(uuid, uuid) TO service_role;

-- ─── RLS: conversations ────────────────────────────────────────────────────────
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "conversations_select_member_or_creator" ON public.conversations;
CREATE POLICY "conversations_select_member_or_creator"
  ON public.conversations FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid()
    OR public.dm_is_conversation_participant(id, auth.uid())
  );

DROP POLICY IF EXISTS "conversations_insert_as_creator" ON public.conversations;
CREATE POLICY "conversations_insert_as_creator"
  ON public.conversations FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "conversations_update_member" ON public.conversations;
CREATE POLICY "conversations_update_member"
  ON public.conversations FOR UPDATE
  TO authenticated
  USING (public.dm_is_conversation_participant(id, auth.uid()))
  WITH CHECK (public.dm_is_conversation_participant(id, auth.uid()));

-- ─── RLS: conversation_participants ────────────────────────────────────────────
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "conversation_participants_select_same_conv" ON public.conversation_participants;
CREATE POLICY "conversation_participants_select_same_conv"
  ON public.conversation_participants FOR SELECT
  TO authenticated
  USING (public.dm_is_conversation_participant(conversation_id, auth.uid()));

DROP POLICY IF EXISTS "conversation_participants_insert_self_or_inviter" ON public.conversation_participants;
CREATE POLICY "conversation_participants_insert_self_or_inviter"
  ON public.conversation_participants FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR public.dm_is_conversation_participant(conversation_id, auth.uid())
  );

DROP POLICY IF EXISTS "conversation_participants_update_member" ON public.conversation_participants;
CREATE POLICY "conversation_participants_update_member"
  ON public.conversation_participants FOR UPDATE
  TO authenticated
  USING (public.dm_is_conversation_participant(conversation_id, auth.uid()))
  WITH CHECK (public.dm_is_conversation_participant(conversation_id, auth.uid()));

-- ─── RLS: direct_messages ─────────────────────────────────────────────────────
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "direct_messages_select_member" ON public.direct_messages;
CREATE POLICY "direct_messages_select_member"
  ON public.direct_messages FOR SELECT
  TO authenticated
  USING (public.dm_is_conversation_participant(conversation_id, auth.uid()));

DROP POLICY IF EXISTS "direct_messages_insert_member_as_sender" ON public.direct_messages;
CREATE POLICY "direct_messages_insert_member_as_sender"
  ON public.direct_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND public.dm_is_conversation_participant(conversation_id, auth.uid())
  );

-- Realtime (optional but matches client subscriptions)
ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_participants;
