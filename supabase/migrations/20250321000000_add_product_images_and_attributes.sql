/*
  # Add brand name and additional image fields to inventory items

  1. Changes
    - Add brand_name column to inventory_items
    - Add image_url_2 and image_url_3 columns to inventory_items
    - Add indexes for better query performance
*/

-- Add brand_name column to inventory_items
ALTER TABLE inventory_items
ADD COLUMN IF NOT EXISTS brand_name text;

-- Add additional image columns to inventory_items
ALTER TABLE inventory_items
ADD COLUMN IF NOT EXISTS image_url_2 text,
ADD COLUMN IF NOT EXISTS image_url_3 text;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_inventory_brand_name ON inventory_items(brand_name);

-- Update RLS policies to allow public read access but restrict modifications to admins
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to inventory items"
ON inventory_items
FOR SELECT
TO public
USING (true);

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

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_inventory_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS inventory_updated ON inventory_items;
CREATE TRIGGER inventory_updated
  BEFORE UPDATE ON inventory_items
  FOR EACH ROW
  EXECUTE FUNCTION update_inventory_updated_at(); 