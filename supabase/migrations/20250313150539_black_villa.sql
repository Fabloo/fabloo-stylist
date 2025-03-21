/*
  # Fix cart items table foreign key

  1. Changes
    - Drop existing cart_items table
    - Recreate cart_items table with correct user_id reference
    - Recreate indexes and policies
    - Add trigger for updated_at

  2. Security
    - Enable RLS
    - Add policy for authenticated users to manage their cart
*/

-- Drop existing table and all its dependencies
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

-- Create trigger for updated_at
CREATE TRIGGER update_cart_items_updated_at
  BEFORE UPDATE ON cart_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();