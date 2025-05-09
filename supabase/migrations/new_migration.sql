ALTER TABLE inventory_items 
ADD COLUMN IF NOT EXISTS sizes text[] NOT NULL DEFAULT '{}'; 

-- Add reviewer_info JSONB column to shared_items table
ALTER TABLE shared_items ADD COLUMN reviewer_info JSONB;

-- Create a policy to allow updating reviewer_info
CREATE POLICY "Anyone can update reviewer_info on shared items"
  ON shared_items
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Update the friend_circles table to support phone numbers
ALTER TABLE friend_circles DROP CONSTRAINT IF EXISTS friend_circles_friend_status_check;
ALTER TABLE friend_circles ADD CONSTRAINT friend_circles_friend_status_check
  CHECK (friend_status IN ('pending', 'joined', 'rejected'));

-- If email is used instead of phone, allow for phone column
ALTER TABLE friend_circles ADD COLUMN IF NOT EXISTS friend_phone TEXT;

-- Update existing constraints if needed
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM pg_constraint 
    WHERE conname = 'friend_circles_user_id_friend_email_key'
  ) THEN
    ALTER TABLE friend_circles DROP CONSTRAINT friend_circles_user_id_friend_email_key;
    ALTER TABLE friend_circles ADD CONSTRAINT friend_circles_user_id_friend_contact_key 
      UNIQUE (user_id, COALESCE(friend_phone, friend_email));
  END IF;
END
$$; 