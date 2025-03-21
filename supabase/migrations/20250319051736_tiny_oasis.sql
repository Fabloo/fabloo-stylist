/*
  # Add size selection functionality

  1. New Tables
    - `product_sizes`: Stores available sizes and stock per size
      - `id` (uuid, primary key)
      - `item_id` (uuid, references inventory_items)
      - `size` (text)
      - `stock` (integer)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Changes
    - Add size_selected to cart_items table
    - Update RLS policies
    - Add indexes for performance
*/

-- Create product_sizes table
CREATE TABLE IF NOT EXISTS product_sizes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid REFERENCES inventory_items(id) ON DELETE CASCADE,
  size text NOT NULL,
  stock integer NOT NULL DEFAULT 0 CHECK (stock >= 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(item_id, size)
);

-- Add size_selected to cart_items
ALTER TABLE cart_items
ADD COLUMN IF NOT EXISTS size_selected text;

-- Add size_selected to order_items
ALTER TABLE order_items
ADD COLUMN IF NOT EXISTS size_selected text;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_product_sizes_item_id ON product_sizes(item_id);
CREATE INDEX IF NOT EXISTS idx_product_sizes_stock ON product_sizes(stock);

-- Enable RLS
ALTER TABLE product_sizes ENABLE ROW LEVEL SECURITY;

-- Create policies for product_sizes
CREATE POLICY "Anyone can view product sizes"
  ON product_sizes
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Only admins can modify product sizes"
  ON product_sizes
  FOR ALL
  TO authenticated
  USING ((auth.jwt() ->> 'role'::text) = 'admin'::text)
  WITH CHECK ((auth.jwt() ->> 'role'::text) = 'admin'::text);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_product_sizes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_product_sizes_updated_at
  BEFORE UPDATE ON product_sizes
  FOR EACH ROW
  EXECUTE FUNCTION update_product_sizes_updated_at();

-- Update valid_inventory_format view
DROP VIEW IF EXISTS valid_inventory_format;

CREATE VIEW valid_inventory_format AS
WITH format_data AS (
  SELECT *
  FROM (
    VALUES
      ('Required Fields', 'name', 'text', 'Product name (1-100 characters)'),
      ('Required Fields', 'description', 'text', 'Product description (max 500 characters)'),
      ('Required Fields', 'price', 'numeric', 'Product price (greater than 0)'),
      ('Required Fields', 'image_url', 'text', 'Valid HTTPS URL for product image'),
      ('Required Fields', 'sizes', 'jsonb', 'Available sizes with stock {"XS": 5, "S": 10, "M": 15, "L": 10, "XL": 5}'),
      ('Required Fields', 'body_shapes', 'text[]', 'Array of body shapes ["hourglass", "pear", "rectangle", "inverted-triangle", "apple"]'),
      ('Required Fields', 'color_tones', 'text[]', 'Array of color seasons ["warm", "cool", "neutral"]'),
      ('Required Fields', 'dress_type', 'text', 'Type of dress (e.g., "wrap", "a-line", "sheath")'),
      ('Optional Fields', 'occasion_tags', 'text[]', 'Array of occasions ["casual", "formal", "party", "work", "vacation"]'),
      ('Optional Fields', 'style_tags', 'text[]', 'Array of styles ["classic", "modern", "bohemian", "elegant", "minimalist"]'),
      ('Optional Fields', 'seasonal_tags', 'text[]', 'Array of seasons ["spring", "summer", "fall", "winter"]'),
      ('Optional Fields', 'fabric_composition', 'jsonb', 'Material composition as percentage object {"cotton": 95, "elastane": 5}'),
      ('Optional Fields', 'care_instructions', 'text[]', 'Array of care instructions ["machine wash", "dry clean", "hand wash"]')
    ) AS t(section, field, type, description)
)
SELECT 
  section,
  field,
  type,
  description
FROM format_data
ORDER BY 
  CASE section 
    WHEN 'Required Fields' THEN 1 
    WHEN 'Optional Fields' THEN 2 
    ELSE 3 
  END,
  field;

-- Add comment to view
COMMENT ON VIEW valid_inventory_format IS 'Reference for valid inventory upload format with field specifications and validation rules';

-- Insert sample data
INSERT INTO product_sizes (item_id, size, stock)
SELECT 
  i.id,
  s.size,
  CASE 
    WHEN s.size IN ('S', 'M') THEN floor(random() * 10 + 5)::integer
    ELSE floor(random() * 5 + 1)::integer
  END as stock
FROM 
  inventory_items i
  CROSS JOIN (
    SELECT unnest(ARRAY['XS', 'S', 'M', 'L', 'XL']) as size
  ) s
ON CONFLICT (item_id, size) DO UPDATE
SET stock = EXCLUDED.stock;