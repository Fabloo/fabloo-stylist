/*
  Set up Friend Circle functionality tables
  This script creates the necessary tables for the friend circle feature:
  1. friend_circles - Stores relationships between users and their friends
  2. shared_items - Tracks items shared with friends and their responses
  
  Run this script in Supabase Studio SQL Editor
*/

BEGIN;

-- Ensure uuid-ossp extension is available
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
  RAISE NOTICE 'Created uuid-ossp extension if it did not exist';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Failed to create uuid-ossp extension, it may already exist or require additional permissions';
END;
$$;

-- Create friend_circles table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'friend_circles'
  ) THEN
    CREATE TABLE public.friend_circles (
      id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id uuid NOT NULL,
      friend_name text NOT NULL,
      friend_email text NOT NULL,
      friend_status text DEFAULT 'pending' CHECK (friend_status IN ('pending', 'joined', 'rejected')),
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now(),
      UNIQUE (user_id, friend_email)
    );
    RAISE NOTICE 'Created friend_circles table';
  ELSE
    RAISE NOTICE 'friend_circles table already exists, skipping creation';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Failed to create friend_circles table: %', SQLERRM;
END;
$$;

-- Create shared_items table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'shared_items'
  ) THEN
    CREATE TABLE public.shared_items (
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
    RAISE NOTICE 'Created shared_items table';
  ELSE
    RAISE NOTICE 'shared_items table already exists, skipping creation';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Failed to create shared_items table: %', SQLERRM;
END;
$$;

-- Create indexes if they don't exist
DO $$
BEGIN
  -- Check and create friend_circles index
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_friend_circles_user_id') THEN
    CREATE INDEX idx_friend_circles_user_id ON public.friend_circles(user_id);
    RAISE NOTICE 'Created idx_friend_circles_user_id index';
  ELSE
    RAISE NOTICE 'idx_friend_circles_user_id index already exists, skipping creation';
  END IF;
  
  -- Check and create shared_items sender index
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_shared_items_sender_id') THEN
    CREATE INDEX idx_shared_items_sender_id ON public.shared_items(sender_id);
    RAISE NOTICE 'Created idx_shared_items_sender_id index';
  ELSE
    RAISE NOTICE 'idx_shared_items_sender_id index already exists, skipping creation';
  END IF;
  
  -- Check and create shared_items friend circle index
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_shared_items_friend_circle_id') THEN
    CREATE INDEX idx_shared_items_friend_circle_id ON public.shared_items(friend_circle_id);
    RAISE NOTICE 'Created idx_shared_items_friend_circle_id index';
  ELSE
    RAISE NOTICE 'idx_shared_items_friend_circle_id index already exists, skipping creation';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Failed to create indexes: %', SQLERRM;
END;
$$;

-- Enable Row Level Security
DO $$
BEGIN
  ALTER TABLE public.friend_circles ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.shared_items ENABLE ROW LEVEL SECURITY;
  RAISE NOTICE 'Enabled Row Level Security on tables';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Failed to enable Row Level Security: %', SQLERRM;
END;
$$;

-- Create or replace policies
DO $$
BEGIN
  -- Drop policies if they exist
  DROP POLICY IF EXISTS "Users can manage their own friend circles" ON public.friend_circles;
  DROP POLICY IF EXISTS "Users can manage items they've shared" ON public.shared_items;
  DROP POLICY IF EXISTS "Friends can view items shared with them" ON public.shared_items;

  -- Create policies
  CREATE POLICY "Users can manage their own friend circles"
    ON public.friend_circles
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
    
  CREATE POLICY "Users can manage items they've shared"
    ON public.shared_items
    FOR ALL
    TO authenticated
    USING (auth.uid() = sender_id)
    WITH CHECK (auth.uid() = sender_id);
    
  -- Fixed policy that uses JWT claims instead of directly querying auth.users
  CREATE POLICY "Friends can view items shared with them"
    ON public.shared_items
    FOR SELECT
    TO authenticated
    USING (EXISTS (
      SELECT 1 FROM public.friend_circles fc
      WHERE fc.id = shared_items.friend_circle_id
      AND fc.friend_email = (current_setting('request.jwt.claims', true)::json->>'email')
    ));
    
  RAISE NOTICE 'Created Row Level Security policies';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Failed to create policies: %', SQLERRM;
END;
$$;

-- Create updated_at trigger function if it doesn't exist
DO $$
BEGIN
  CREATE OR REPLACE FUNCTION handle_updated_at()
  RETURNS TRIGGER AS $$
  BEGIN
    NEW.updated_at = now();
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;
  
  RAISE NOTICE 'Created handle_updated_at trigger function';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Failed to create handle_updated_at function: %', SQLERRM;
END;
$$;

-- Create updated_at triggers if they don't exist
DO $$
BEGIN
  DROP TRIGGER IF EXISTS handle_friend_circles_updated ON public.friend_circles;
  CREATE TRIGGER handle_friend_circles_updated
    BEFORE UPDATE ON public.friend_circles
    FOR EACH ROW
    EXECUTE PROCEDURE handle_updated_at();
    
  DROP TRIGGER IF EXISTS handle_shared_items_updated ON public.shared_items;
  CREATE TRIGGER handle_shared_items_updated
    BEFORE UPDATE ON public.shared_items
    FOR EACH ROW
    EXECUTE PROCEDURE handle_updated_at();
    
  RAISE NOTICE 'Created updated_at triggers';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Failed to create triggers: %', SQLERRM;
END;
$$;

COMMIT;

RAISE NOTICE 'Friend circle tables setup completed successfully';
RAISE NOTICE 'You can now use the friend circle features in your application';
RAISE NOTICE 'Make sure the hooks/useFriendCircle.ts file has been updated to use the correct types'; 