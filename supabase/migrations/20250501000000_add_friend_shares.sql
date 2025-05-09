/*
  # Add Friend Shares functionality

  This migration adds the ability to track individual friend responses
  when sharing items with multiple friends at once.

  1. New Tables
    - `friend_shares`: Tracks individual responses when an item is shared with multiple friends
*/

-- Create friend_shares table to track batch shares
CREATE TABLE IF NOT EXISTS public.friend_shares (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  shared_item_id uuid NOT NULL REFERENCES public.shared_items(id) ON DELETE CASCADE,
  friend_circle_id uuid NOT NULL REFERENCES public.friend_circles(id) ON DELETE CASCADE,
  response_status text DEFAULT 'pending' CHECK (response_status IN ('pending', 'liked', 'disliked')),
  response_comment text,
  viewed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_friend_shares_shared_item_id ON public.friend_shares(shared_item_id);
CREATE INDEX IF NOT EXISTS idx_friend_shares_friend_circle_id ON public.friend_shares(friend_circle_id);

-- Enable RLS
ALTER TABLE public.friend_shares ENABLE ROW LEVEL SECURITY;

-- Create policies for friend_shares
CREATE POLICY "Users can manage friend shares they've created"
  ON public.friend_shares
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.shared_items si
    WHERE si.id = friend_shares.shared_item_id
    AND si.sender_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.shared_items si
    WHERE si.id = friend_shares.shared_item_id
    AND si.sender_id = auth.uid()
  ));

-- Create policy for friends to view and update shares meant for them
CREATE POLICY "Friends can view and update their own shares"
  ON public.friend_shares
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.friend_circles fc
    WHERE fc.id = friend_shares.friend_circle_id
    AND fc.friend_phone = (current_setting('request.jwt.claims', true)::json->>'phone')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.friend_circles fc
    WHERE fc.id = friend_shares.friend_circle_id
    AND fc.friend_phone = (current_setting('request.jwt.claims', true)::json->>'phone')
  ));

-- Create updated_at trigger for friend_shares
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER handle_friend_shares_updated
  BEFORE UPDATE ON public.friend_shares
  FOR EACH ROW
  EXECUTE PROCEDURE handle_updated_at();

-- Grant permissions
GRANT ALL ON public.friend_shares TO authenticated;

-- Modify shared_items table to be more flexible (remove required friend_circle_id constraint)
ALTER TABLE public.shared_items ALTER COLUMN friend_circle_id DROP NOT NULL;

-- Update existing policy to be more flexible
DROP POLICY IF EXISTS "Friends can view items shared with them" ON public.shared_items;
CREATE POLICY "Friends can view items shared with them"
  ON public.shared_items
  FOR SELECT
  TO authenticated
  USING (
    (friend_circle_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.friend_circles fc
      WHERE fc.id = shared_items.friend_circle_id
      AND fc.friend_phone = (current_setting('request.jwt.claims', true)::json->>'phone')
    ))
    OR
    (EXISTS (
      SELECT 1 FROM public.friend_shares fs
      JOIN public.friend_circles fc ON fs.friend_circle_id = fc.id
      WHERE fs.shared_item_id = shared_items.id
      AND fc.friend_phone = (current_setting('request.jwt.claims', true)::json->>'phone')
    ))
  ); 