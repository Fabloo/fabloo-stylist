-- This is a simplified setup script for friend circle functionality
-- Run this in the Supabase SQL Editor to create the necessary tables

-- Create UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create friend_circles table
CREATE TABLE IF NOT EXISTS public.friend_circles (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  friend_name text NOT NULL,
  friend_phone text NOT NULL,
  friend_status text DEFAULT 'pending' CHECK (friend_status IN ('pending', 'joined', 'rejected')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (user_id, friend_phone)
);

-- Create shared_items table
CREATE TABLE IF NOT EXISTS public.shared_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id uuid NOT NULL,
  friend_circle_id uuid NOT NULL REFERENCES public.friend_circles(id) ON DELETE CASCADE,
  item_id text NOT NULL,
  comment text,
  response_status text DEFAULT 'pending' CHECK (response_status IN ('pending', 'liked', 'disliked')),
  response_comment text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_friend_circles_user_id ON public.friend_circles(user_id);
CREATE INDEX IF NOT EXISTS idx_shared_items_sender_id ON public.shared_items(sender_id);
CREATE INDEX IF NOT EXISTS idx_shared_items_friend_circle_id ON public.shared_items(friend_circle_id);

-- Enable Row Level Security
ALTER TABLE public.friend_circles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- For friend_circles table
DROP POLICY IF EXISTS "Users can manage their own friend circles" ON public.friend_circles;
CREATE POLICY "Users can manage their own friend circles"
  ON public.friend_circles
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- For shared_items table - allow management by sender
DROP POLICY IF EXISTS "Users can manage items they've shared" ON public.shared_items;
CREATE POLICY "Users can manage items they've shared"
  ON public.shared_items
  FOR ALL
  TO authenticated
  USING (auth.uid() = sender_id)
  WITH CHECK (auth.uid() = sender_id);

-- For shared_items table - allow viewing by recipient
-- Fixed policy that doesn't rely on accessing auth.users table directly
DROP POLICY IF EXISTS "Friends can view items shared with them" ON public.shared_items;
CREATE POLICY "Friends can view items shared with them"
  ON public.shared_items
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.friend_circles fc
    WHERE fc.id = shared_items.friend_circle_id
    AND fc.friend_phone = (current_setting('request.jwt.claims', true)::json->>'phone')
  ));

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to automatically update timestamps
DROP TRIGGER IF EXISTS handle_friend_circles_updated ON public.friend_circles;
CREATE TRIGGER handle_friend_circles_updated
  BEFORE UPDATE ON public.friend_circles
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_shared_items_updated ON public.shared_items;
CREATE TRIGGER handle_shared_items_updated
  BEFORE UPDATE ON public.shared_items
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_updated_at();

-- Grant appropriate permissions to tables
GRANT ALL ON public.friend_circles TO authenticated;
GRANT ALL ON public.shared_items TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Output success message
SELECT 'Friend circle tables successfully set up!' AS setup_message; 