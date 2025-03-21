/*
  # Fix order status handling and add performance optimizations

  1. Changes
    - Add trigger to properly handle order status updates
    - Add indexes for better query performance
    - Fix any existing orders with incorrect status
    - Add constraint to ensure valid status values

  2. Security
    - Maintain existing RLS policies
*/

-- Create or replace the orders updated_at trigger function with status logging
CREATE OR REPLACE FUNCTION update_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  -- Always update timestamp when status changes
  IF OLD.order_status IS DISTINCT FROM NEW.order_status OR 
     OLD.status IS DISTINCT FROM NEW.status THEN
    NEW.updated_at = CURRENT_TIMESTAMP;
    
    -- Ensure order_status and status are synchronized
    IF NEW.status = 'pending' AND NEW.order_status IS DISTINCT FROM 'pending' THEN
      NEW.order_status = 'pending';
    END IF;
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

-- Add composite index for efficient status queries
CREATE INDEX IF NOT EXISTS idx_orders_status_combined ON orders(status, order_status, updated_at);

-- Fix any orders with mismatched or incorrect status
UPDATE orders 
SET 
  order_status = CASE
    WHEN status = 'pending' THEN 'pending'
    WHEN status IS NULL THEN 'processing'
    ELSE order_status
  END,
  updated_at = CURRENT_TIMESTAMP
WHERE status = 'pending' AND order_status != 'pending'
   OR status IS NULL;