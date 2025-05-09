-- Friend Circle Verification Script
-- Run this after applying the simplified-friend-circle-setup.sql to verify everything works

-- Verify tables exist
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'friend_circles'
) AS "friend_circles_table_exists";

SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'shared_items'
) AS "shared_items_table_exists";

-- Verify RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('friend_circles', 'shared_items');

-- Verify policies exist
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename IN ('friend_circles', 'shared_items');

-- Test adding a friend to your circle
INSERT INTO public.friend_circles (
  user_id,
  friend_name,
  friend_email,
  friend_status
) VALUES (
  auth.uid(),
  'Test Friend',
  'test@example.com',
  'pending'
) RETURNING id, user_id, friend_name, friend_email, friend_status;

-- Test querying friend circle
SELECT * FROM public.friend_circles WHERE user_id = auth.uid();

-- Get user email from JWT token (just to verify it works)
SELECT current_setting('request.jwt.claims', true)::json->>'email' AS current_user_email;

-- Clean up test data if needed (uncomment to execute)
-- DELETE FROM public.friend_circles WHERE user_id = auth.uid() AND friend_email = 'test@example.com'; 