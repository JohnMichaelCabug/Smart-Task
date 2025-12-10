-- ============================================
-- MESSAGING SYSTEM - COMPLETE SQL UPDATE
-- ============================================
-- Run this SQL in your Supabase project as the project owner
-- This sets up role-based messaging with validation

-- ============================================
-- VALIDATION FUNCTION
-- ============================================

-- Validate message permissions based on user roles
-- Rules:
--   - Guests cannot send messages
--   - Admin & Staff can message each other
--   - Staff can message Clients
--   - Clients can message Staff
--   - All other combinations are blocked

CREATE OR REPLACE FUNCTION validate_message_permissions()
RETURNS TRIGGER AS $$
DECLARE
  sender_role varchar;
  recipient_role varchar;
BEGIN
  -- Get sender and recipient roles
  SELECT role INTO sender_role FROM public.users WHERE id = NEW.sender_id;
  SELECT role INTO recipient_role FROM public.users WHERE id = NEW.recipient_id;

  -- Guests cannot send messages
  IF sender_role = 'guest' THEN
    RAISE EXCEPTION 'Guests cannot send messages';
  END IF;

  -- Admin & Staff can message each other
  IF (sender_role IN ('admin', 'staff') AND recipient_role IN ('admin', 'staff')) THEN
    RETURN NEW;
  END IF;

  -- Staff can message Clients
  IF (sender_role = 'staff' AND recipient_role = 'client') THEN
    RETURN NEW;
  END IF;

  -- Clients can message Staff
  IF (sender_role = 'client' AND recipient_role = 'staff') THEN
    RETURN NEW;
  END IF;

  -- All other combinations are not allowed
  RAISE EXCEPTION 'User with role % cannot message user with role %', sender_role, recipient_role;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- MESSAGES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL,
  recipient_id uuid NOT NULL,
  message text NOT NULL,
  message_type character varying(50) NULL DEFAULT 'user_message'::character varying,
  read boolean NULL DEFAULT false,
  created_at timestamp without time zone NULL DEFAULT now(),
  updated_at timestamp without time zone NULL DEFAULT now(),
  CONSTRAINT messages_pkey PRIMARY KEY (id),
  CONSTRAINT messages_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT no_self_message CHECK ((sender_id <> recipient_id))
) TABLESPACE pg_default;

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages USING btree (sender_id) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_messages_recipient_id ON public.messages USING btree (recipient_id) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages USING btree (created_at DESC) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_messages_sender_recipient ON public.messages USING btree (sender_id, recipient_id) TABLESPACE pg_default;

-- ============================================
-- TRIGGER FOR VALIDATION
-- ============================================

DROP TRIGGER IF EXISTS before_message_insert ON messages;

CREATE TRIGGER before_message_insert BEFORE INSERT ON messages FOR EACH ROW
EXECUTE FUNCTION validate_message_permissions();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on messages table
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only view messages they're involved in
DROP POLICY IF EXISTS messages_select_policy ON messages;
CREATE POLICY messages_select_policy ON messages
FOR SELECT
USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

-- Policy: Users can only insert messages as the sender
DROP POLICY IF EXISTS messages_insert_policy ON messages;
CREATE POLICY messages_insert_policy ON messages
FOR INSERT
WITH CHECK (auth.uid() = sender_id);

-- Policy: Users can only update messages they received (mark as read)
DROP POLICY IF EXISTS messages_update_policy ON messages;
CREATE POLICY messages_update_policy ON messages
FOR UPDATE
USING (auth.uid() = recipient_id)
WITH CHECK (auth.uid() = recipient_id);

-- Policy: Users can only delete messages they sent
DROP POLICY IF EXISTS messages_delete_policy ON messages;
CREATE POLICY messages_delete_policy ON messages
FOR DELETE
USING (auth.uid() = sender_id);

-- ============================================
-- PERMISSIONS
-- ============================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;
GRANT EXECUTE ON FUNCTION validate_message_permissions() TO authenticated;

-- ============================================
-- PERMISSION MATRIX
-- ============================================
-- 
-- From\To    | Admin | Staff | Client | Guest
-- -----------+-------+-------+--------+-------
-- Admin      |  ✓    |  ✓    |  ✓     |  ✗
-- Staff      |  ✓    |  ✓    |  ✓     |  ✗
-- Client     |  ✗    |  ✓    |  ✗     |  ✗
-- Guest      |  ✗    |  ✗    |  ✗     |  ✗
--
-- ✓ = Can send message
-- ✗ = Cannot send message (will raise exception)

-- ============================================
-- VERIFICATION QUERIES (Optional)
-- ============================================

-- Check if messages table exists
-- SELECT table_name FROM information_schema.tables WHERE table_name = 'messages';

-- Check if trigger exists
-- SELECT trigger_name FROM information_schema.triggers WHERE event_object_table = 'messages';

-- Check if RLS is enabled
-- SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'messages';

-- Check if indexes exist
-- SELECT indexname FROM pg_indexes WHERE tablename = 'messages';

-- Check if policies exist
-- SELECT policyname FROM pg_policies WHERE tablename = 'messages';

-- ============================================
-- TEST QUERIES (Optional - Remove in production)
-- ============================================

-- Get all messages for a user (both sent and received)
-- SELECT * FROM public.messages 
-- WHERE sender_id = 'USER_UUID' OR recipient_id = 'USER_UUID'
-- ORDER BY created_at DESC;

-- Get conversation between two users
-- SELECT * FROM public.messages 
-- WHERE (sender_id = 'USER1_UUID' AND recipient_id = 'USER2_UUID')
--    OR (sender_id = 'USER2_UUID' AND recipient_id = 'USER1_UUID')
-- ORDER BY created_at ASC;

-- Mark messages as read
-- UPDATE public.messages 
-- SET read = true, updated_at = now()
-- WHERE recipient_id = 'CURRENT_USER_UUID' AND sender_id = 'OTHER_USER_UUID' AND read = false;

-- Get unread message count for a user
-- SELECT COUNT(*) as unread_count FROM public.messages 
-- WHERE recipient_id = 'USER_UUID' AND read = false;

-- Get unique conversation partners
-- SELECT DISTINCT 
--   CASE 
--     WHEN sender_id = 'CURRENT_USER_UUID' THEN recipient_id 
--     ELSE sender_id 
--   END as partner_id
-- FROM public.messages 
-- WHERE sender_id = 'CURRENT_USER_UUID' OR recipient_id = 'CURRENT_USER_UUID';
