/*
  # Add brands table and relationships

  1. Changes
    - Create brands table with necessary fields
    - Add foreign key constraint to inventory_items
    - Add indexes for better query performance
    - Set up RLS policies and triggers
*/

-- Create brands table
CREATE TABLE IF NOT EXISTS brands (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  logo text,
  return_policy text,
  delivery_time text,
  delivery_cod_cost text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index for faster lookups on brands
CREATE INDEX IF NOT EXISTS idx_brands_name ON brands(name);

-- Enable RLS for brands
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;

-- Create policies for brands
CREATE POLICY "Allow public read access to brands"
ON brands
FOR SELECT
TO public
USING (true);

CREATE POLICY "Only admins can modify brands"
ON brands
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

-- Add trigger for brands updated_at
CREATE OR REPLACE FUNCTION update_brands_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER brands_updated
  BEFORE UPDATE ON brands
  FOR EACH ROW
  EXECUTE FUNCTION update_brands_updated_at();

-- Add brand_id to inventory_items
ALTER TABLE inventory_items
ADD COLUMN IF NOT EXISTS brand_id uuid REFERENCES brands(id);

-- Create index for brand_id in inventory_items
CREATE INDEX IF NOT EXISTS idx_inventory_items_brand_id ON inventory_items(brand_id); 