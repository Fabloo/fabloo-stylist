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

-- Insert sample data
INSERT INTO inventory_items (name, description, price, image_url, stock) VALUES
  (
    'Elegant Wrap Dress',
    'A flattering wrap dress perfect for hourglass figures, made with flowing fabric that complements your curves.',
    129.99,
    'https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&q=80&w=1000',
    10
  ),
  (
    'A-Line Summer Dress',
    'Light and breezy A-line dress that suits multiple body types, featuring a fitted bodice and flared skirt.',
    89.99,
    'https://images.unsplash.com/photo-1502716119720-b23a93e5fe1b?auto=format&fit=crop&q=80&w=1000',
    15
  ),
  (
    'Classic Sheath Dress',
    'Timeless sheath dress that creates a sleek silhouette, perfect for both work and special occasions.',
    149.99,
    'https://images.unsplash.com/photo-1539008835657-9e8e9680c956?auto=format&fit=crop&q=80&w=1000',
    8
  );

INSERT INTO item_attributes (item_id, body_shapes, color_tones, dress_type) 
SELECT 
  id,
  ARRAY['hourglass', 'pear'],
  ARRAY['warm', 'neutral'],
  'dress'
FROM inventory_items 
WHERE name = 'Elegant Wrap Dress';

INSERT INTO item_attributes (item_id, body_shapes, color_tones, dress_type)
SELECT 
  id,
  ARRAY['rectangle', 'apple', 'pear'],
  ARRAY['cool', 'neutral'],
  'dress'
FROM inventory_items
WHERE name = 'A-Line Summer Dress';

INSERT INTO item_attributes (item_id, body_shapes, color_tones, dress_type)
SELECT 
  id,
  ARRAY['hourglass', 'inverted-triangle'],
  ARRAY['cool', 'warm'],
  'dress'
FROM inventory_items
WHERE name = 'Classic Sheath Dress';