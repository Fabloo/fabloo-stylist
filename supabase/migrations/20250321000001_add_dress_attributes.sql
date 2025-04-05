/*
  # Add dress attributes table with JSON structure

  1. Changes
    - Create dress_attributes table with JSON fields
    - Add foreign key constraint to inventory_items
    - Add indexes for better query performance
*/

-- Create dress_attributes table
CREATE TABLE IF NOT EXISTS dress_attributes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid REFERENCES inventory_items(id) ON DELETE CASCADE,
  fabric text,
  length text,
  primary_colour text,
  primary_shades text[],
  pattern text,
  neck text,
  occasion text,
  print text,
  shape text,
  sleeve_length text,
  sleeve_styling text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_dress_attributes_product_id ON dress_attributes(product_id);

-- Enable RLS
ALTER TABLE dress_attributes ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow public read access to dress attributes"
ON dress_attributes
FOR SELECT
TO public
USING (true);

CREATE POLICY "Only admins can modify dress attributes"
ON dress_attributes
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

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_dress_attributes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER dress_attributes_updated
  BEFORE UPDATE ON dress_attributes
  FOR EACH ROW
  EXECUTE FUNCTION update_dress_attributes_updated_at(); 