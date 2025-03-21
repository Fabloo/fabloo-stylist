/*
  # Add Cart Items Table

  1. New Tables
    - `cart_items`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references users)
      - `item_id` (uuid, references inventory_items)
      - `quantity` (integer, positive)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
  
  2. Security
    - Enable RLS on cart_items table
    - Add policy for users to manage their own cart items
  
  3. Indexes
    - Add indexes for user_id and item_id for better query performance
*/

DO $$ BEGIN
  -- Drop existing policy if it exists
  DROP POLICY IF EXISTS "Users can manage their own cart" ON cart_items;
END $$;

-- Create cart_items table if it doesn't exist
CREATE TABLE IF NOT EXISTS cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id uuid REFERENCES inventory_items(id) ON DELETE CASCADE,
  quantity integer NOT NULL CHECK (quantity > 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, item_id)
);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON cart_items(user_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_item_id ON cart_items(item_id);

-- Enable RLS
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

-- Create policy for cart management
CREATE POLICY "Users can manage their own cart"
  ON cart_items
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger if it doesn't exist
DROP TRIGGER IF EXISTS update_cart_items_updated_at ON cart_items;
CREATE TRIGGER update_cart_items_updated_at
  BEFORE UPDATE ON cart_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();