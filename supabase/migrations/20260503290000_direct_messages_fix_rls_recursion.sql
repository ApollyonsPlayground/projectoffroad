-- Fix PostgREST 500 on conversations / conversation_participants:
-- Policies that used EXISTS (SELECT … FROM conversation_participants …) inside
-- conversation_participants RLS caused infinite recursion in Postgres.

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
