/*
  # Add RLS policies for order_items table

  1. Security
    - Enable RLS on order_items table
    - Add policy for users to insert their own order items
    - Add policy for users to view their own order items
    - Link order_items access to orders table ownership

  2. Changes
    - Enable RLS
    - Add insert policy
    - Add select policy
*/

-- Enable RLS
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Policy for inserting order items
-- Users can only insert items for orders they own
CREATE POLICY "Users can insert items for their orders" ON order_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.user_id = auth.uid()
    )
  );

-- Policy for viewing order items
-- Users can only view items from their own orders
CREATE POLICY "Users can view their order items" ON order_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.user_id = auth.uid()
    )
  );