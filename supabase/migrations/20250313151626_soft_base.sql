/*
  # Fix cart items table structure and constraints

  1. Changes
    - Drop existing cart_items table
    - Recreate cart_items table with correct constraints
    - Add proper indexes and foreign keys
    - Enable RLS with appropriate policies

  2. Security
    - Enable RLS
    - Add policy for users to manage their own cart items
*/

-- Drop existing table if it exists
DROP TABLE IF EXISTS cart_items;

-- Create cart_items table
CREATE TABLE cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  item_id uuid REFERENCES inventory_items(id) ON DELETE CASCADE,
  quantity integer NOT NULL CHECK (quantity > 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, item_id)
);

-- Create indexes
CREATE INDEX idx_cart_items_user_id ON cart_items(user_id);
CREATE INDEX idx_cart_items_item_id ON cart_items(item_id);

-- Enable RLS
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

-- Create policy for cart management
CREATE POLICY "Users can manage their own cart"
  ON cart_items
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_cart_items_updated_at
  BEFORE UPDATE ON cart_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();