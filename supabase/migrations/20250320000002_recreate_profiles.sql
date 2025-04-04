/*
  # Recreate profiles table with all columns

  This migration:
  1. Backs up existing data
  2. Drops and recreates the table with all columns
  3. Restores the data
*/

-- First, create a backup table
CREATE TABLE IF NOT EXISTS profiles_backup AS 
SELECT * FROM profiles;

-- Drop the existing table and all its dependencies
DROP TABLE IF EXISTS profiles CASCADE;

-- Recreate the table with all columns
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  body_shape text,
  skin_tone jsonb,
  address_line1 text,
  address_line2 text,
  city text,
  state text,
  pincode text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_pincode CHECK (
    pincode IS NULL OR 
    pincode ~ '^[0-9]{6}$'
  )
);

-- Restore data from backup
INSERT INTO profiles (
  id,
  body_shape,
  skin_tone,
  created_at,
  updated_at
)
SELECT 
  id,
  body_shape,
  skin_tone,
  created_at,
  updated_at
FROM profiles_backup;

-- Drop the backup table
DROP TABLE profiles_backup;

-- Create indexes
CREATE INDEX idx_profiles_id ON profiles(id);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can create their own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can view own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER handle_profile_updated
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE PROCEDURE handle_updated_at(); 