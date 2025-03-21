/*
  # Fix orders table structure and add missing fields

  1. Changes
    - Add order_status field with proper constraints
    - Add default values for status fields
    - Add indexes for better performance
    - Update existing orders to have proper status

  2. Security
    - Ensure RLS policies are correct
    - Add policy for order status updates
*/

-- Drop existing order status check constraint if it exists
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_order_status_check;

-- Update order_status field with proper constraints
ALTER TABLE orders 
ALTER COLUMN order_status SET DEFAULT 'pending',
ADD CONSTRAINT orders_order_status_check 
  CHECK (order_status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled'));

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_orders_order_status ON orders(order_status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);

-- Update existing orders to have proper status if they don't
UPDATE orders 
SET order_status = 'pending' 
WHERE order_status IS NULL OR order_status = '';

-- Ensure RLS is enabled
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view and create their own orders" ON orders;

-- Create comprehensive policies for orders
CREATE POLICY "Users can view and create their own orders"
  ON orders
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create trigger for updated_at if it doesn't exist
CREATE OR REPLACE FUNCTION update_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_orders_updated_at();