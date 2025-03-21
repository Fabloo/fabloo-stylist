/*
  # Fix order status and triggers

  1. Changes
    - Add trigger to update order status timestamps
    - Ensure order_status is properly set
    - Add indexes for better performance

  2. Security
    - Maintain existing RLS policies
*/

-- Create or replace the orders updated_at trigger function
CREATE OR REPLACE FUNCTION update_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update timestamp if status changed
  IF OLD.order_status IS DISTINCT FROM NEW.order_status THEN
    NEW.updated_at = CURRENT_TIMESTAMP;
  END IF;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Recreate the trigger
DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_orders_updated_at();

-- Add index for order status if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_orders_status_updated ON orders(order_status, updated_at);

-- Update any existing orders with null status
UPDATE orders 
SET 
  order_status = COALESCE(order_status, 'processing'),
  updated_at = CURRENT_TIMESTAMP
WHERE order_status IS NULL;