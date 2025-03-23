-- Add role column to profiles if it doesn't exist
ALTER TABLE IF EXISTS profiles
ADD COLUMN IF NOT EXISTS role text DEFAULT 'user';

-- Create function to set admin role in JWT
CREATE OR REPLACE FUNCTION public.set_claim(uid uuid, claim text, value jsonb)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM auth.users WHERE id = uid
  ) THEN
    RETURN 'User not found';
  END IF;

  UPDATE auth.users SET raw_app_meta_data =
    raw_app_meta_data ||
    json_build_object(claim, value)::jsonb
  WHERE id = uid;
  
  RETURN 'OK';
END;
$$;

-- Create procedure to promote user to admin
CREATE OR REPLACE PROCEDURE promote_to_admin(user_email text)
LANGUAGE plpgsql
AS $$
DECLARE
  target_user_id uuid;
BEGIN
  -- Get user ID from email
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE email = user_email;

  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Set role in profiles table
  UPDATE profiles
  SET role = 'admin'
  WHERE id = target_user_id;

  -- Set role in JWT claims
  PERFORM set_claim(target_user_id, 'role', '"admin"'::jsonb);
END;
$$;

-- Update RLS policies for inventory_items to check both JWT and profiles
DROP POLICY IF EXISTS "Only admins can modify inventory items" ON inventory_items;
CREATE POLICY "Only admins can modify inventory items"
ON inventory_items
FOR ALL
TO authenticated
USING (
  (auth.jwt() ->> 'role'::text) = 'admin'::text
  OR EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
)
WITH CHECK (
  (auth.jwt() ->> 'role'::text) = 'admin'::text
  OR EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Update RLS policies for item_attributes to check both JWT and profiles
DROP POLICY IF EXISTS "Only admins can modify item attributes" ON item_attributes;
CREATE POLICY "Only admins can modify item attributes"
ON item_attributes
FOR ALL
TO authenticated
USING (
  (auth.jwt() ->> 'role'::text) = 'admin'::text
  OR EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
)
WITH CHECK (
  (auth.jwt() ->> 'role'::text) = 'admin'::text
  OR EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Grant execute permission on the promote_to_admin procedure
GRANT EXECUTE ON PROCEDURE promote_to_admin TO service_role; 