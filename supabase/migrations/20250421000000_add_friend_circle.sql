/*
  # Add Friend Circle functionality

  This migration adds the ability for users to maintain a friend circle
  and share product recommendations with them.

  1. New Tables
    - `friend_circles`: Stores relationships between users and their friends
    - `shared_items`: Tracks items shared with friends and their responses
*/

-- Create friend_circles table
CREATE TABLE friend_circles (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_name text NOT NULL,
  friend_email text NOT NULL,
  friend_status text DEFAULT 'pending' CHECK (friend_status IN ('pending', 'joined', 'rejected')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (user_id, friend_email)
);

-- Create shared_items table
CREATE TABLE shared_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_circle_id uuid NOT NULL REFERENCES friend_circles(id) ON DELETE CASCADE,
  item_id text NOT NULL,
  comment text,
  response_status text DEFAULT 'pending' CHECK (response_status IN ('pending', 'liked', 'disliked')),
  response_comment text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_friend_circles_user_id ON friend_circles(user_id);
CREATE INDEX idx_shared_items_sender_id ON shared_items(sender_id);
CREATE INDEX idx_shared_items_friend_circle_id ON shared_items(friend_circle_id);

-- Enable RLS
ALTER TABLE friend_circles ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_items ENABLE ROW LEVEL SECURITY;

-- Create policies for friend_circles
CREATE POLICY "Users can manage their own friend circles"
  ON friend_circles
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create policies for shared_items
CREATE POLICY "Users can manage items they've shared"
  ON shared_items
  FOR ALL
  TO authenticated
  USING (auth.uid() = sender_id)
  WITH CHECK (auth.uid() = sender_id);

-- Create policy for friends to view shared items
-- Uses JWT claims to avoid direct auth.users query which requires elevated permissions
CREATE POLICY "Friends can view items shared with them"
  ON shared_items
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM friend_circles fc
    WHERE fc.id = shared_items.friend_circle_id
    AND fc.friend_email = (current_setting('request.jwt.claims', true)::json->>'email')
  ));

-- Create updated_at trigger for friend_circles
CREATE TRIGGER handle_friend_circles_updated
  BEFORE UPDATE ON friend_circles
  FOR EACH ROW
  EXECUTE PROCEDURE handle_updated_at();

-- Create updated_at trigger for shared_items
CREATE TRIGGER handle_shared_items_updated
  BEFORE UPDATE ON shared_items
  FOR EACH ROW
  EXECUTE PROCEDURE handle_updated_at(); 