/*
  # Add address fields to profiles table

  1. Changes
    - Add address fields to profiles table
    - Add validation for pincode
*/

-- Add address fields to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS address_line1 text,
ADD COLUMN IF NOT EXISTS address_line2 text,
ADD COLUMN IF NOT EXISTS city text,
ADD COLUMN IF NOT EXISTS state text,
ADD COLUMN IF NOT EXISTS pincode text,
-- Add constraint to validate Indian pincode format (6 digits)
ADD CONSTRAINT valid_pincode CHECK (
  pincode IS NULL OR 
  pincode ~ '^[0-9]{6}$'
); 