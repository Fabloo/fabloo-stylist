-- Test script for friend circle permissions
-- Run this in the Supabase SQL Editor to test if the tables and permissions are correctly set up

-- Clear test data first
DELETE FROM public.shared_items WHERE sender_id = auth.uid();
DELETE FROM public.friend_circles WHERE user_id = auth.uid();

-- Try to insert a test friend
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
) RETURNING id;

-- Check if the friend was added
SELECT * FROM public.friend_circles WHERE user_id = auth.uid();

-- Try adding another friend
INSERT INTO public.friend_circles (
  user_id,
  friend_name,
  friend_email,
  friend_status
) VALUES (
  auth.uid(),
  'Another Friend',
  'another@example.com',
  'pending'
) RETURNING id;

-- Check if both friends are in the database
SELECT * FROM public.friend_circles WHERE user_id = auth.uid();

-- Test sharing an item
INSERT INTO public.shared_items (
  sender_id,
  friend_circle_id,
  item_id,
  comment,
  response_status
) VALUES (
  auth.uid(),
  (SELECT id FROM public.friend_circles WHERE user_id = auth.uid() LIMIT 1),
  'test-item-123',
  'Please check this out!',
  'pending'
) RETURNING id;

-- Check if the shared item was added
SELECT 
  si.*,
  fc.friend_name,
  fc.friend_email
FROM 
  public.shared_items si
JOIN 
  public.friend_circles fc ON si.friend_circle_id = fc.id
WHERE 
  si.sender_id = auth.uid();

-- Output success message
SELECT 'Permission test successful! All operations completed without errors.' AS result; 