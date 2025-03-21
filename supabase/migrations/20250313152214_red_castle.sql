/*
  # Create profiles table with trigger check

  1. New Tables
    - `profiles`: Stores user profile information
      - `id` (uuid, primary key, references auth.users)
      - `body_shape` (text, nullable)
      - `skin_tone` (text, nullable)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS
    - Add policies for users to manage their own profile
    - Add trigger for updated_at column with proper checks
*/

-- Drop existing policies and triggers
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can create their profile" ON profiles;
  DROP POLICY IF EXISTS "Users can manage own profile" ON profiles;
  DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
  DROP TRIGGER IF EXISTS profile_updated ON profiles;
END $$;

-- Create profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  body_shape text,
  skin_tone text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can create their profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can manage own profile"
  ON profiles
  FOR ALL
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can read own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Create trigger for updated_at
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'profile_updated'
  ) THEN
    CREATE TRIGGER profile_updated
      BEFORE UPDATE ON profiles
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;