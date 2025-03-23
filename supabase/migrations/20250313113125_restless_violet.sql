/*
  # Create inventory management tables

  1. New Tables
    - `inventory_items`: Stores dress inventory information
      - `id` (uuid, primary key)
      - `name` (text)
      - `description` (text)
      - `price` (numeric)
      - `image_url` (text)
      - `stock` (integer)
      - `sizes` (text array)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `item_attributes`: Stores dress attributes for recommendations
      - `id` (uuid, primary key)
      - `item_id` (uuid, references inventory_items)
      - `body_shapes` (text array)
      - `color_tones` (text array)
      - `dress_type` (text)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Public can view inventory items
    - Only authenticated admins can modify inventory
    - Indexes for efficient querying
*/

DO $$ BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Anyone can view inventory items" ON inventory_items;
  DROP POLICY IF EXISTS "Only admins can modify inventory items" ON inventory_items;
  DROP POLICY IF EXISTS "Anyone can view item attributes" ON item_attributes;
  DROP POLICY IF EXISTS "Only admins can modify item attributes" ON item_attributes;
END $$;

-- Create inventory_items table
CREATE TABLE IF NOT EXISTS inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  price numeric NOT NULL CHECK (price >= 0),
  image_url text NOT NULL,
  stock integer NOT NULL DEFAULT 0 CHECK (stock >= 0),
  sizes text[] NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create item_attributes table
CREATE TABLE IF NOT EXISTS item_attributes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid REFERENCES inventory_items(id) ON DELETE CASCADE,
  body_shapes text[] NOT NULL,
  color_tones text[] NOT NULL,
  dress_type text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_inventory_items_price ON inventory_items(price);
CREATE INDEX IF NOT EXISTS idx_inventory_items_stock ON inventory_items(stock);
CREATE INDEX IF NOT EXISTS idx_item_attributes_body_shapes ON item_attributes USING gin(body_shapes);
CREATE INDEX IF NOT EXISTS idx_item_attributes_color_tones ON item_attributes USING gin(color_tones);
CREATE INDEX IF NOT EXISTS idx_item_attributes_dress_type ON item_attributes(dress_type);

-- Enable RLS
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_attributes ENABLE ROW LEVEL SECURITY;

-- Create policies for inventory_items
CREATE POLICY "Anyone can view inventory items"
  ON inventory_items
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Only admins can modify inventory items"
  ON inventory_items
  FOR ALL
  TO authenticated
  USING ((auth.jwt() ->> 'role'::text) = 'admin'::text)
  WITH CHECK ((auth.jwt() ->> 'role'::text) = 'admin'::text);

-- Create policies for item_attributes
CREATE POLICY "Anyone can view item attributes"
  ON item_attributes
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Only admins can modify item attributes"
  ON item_attributes
  FOR ALL
  TO authenticated
  USING ((auth.jwt() ->> 'role'::text) = 'admin'::text)
  WITH CHECK ((auth.jwt() ->> 'role'::text) = 'admin'::text);