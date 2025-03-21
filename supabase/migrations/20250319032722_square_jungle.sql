/*
  # Add Order Tracking and Returns System

  1. Changes to Orders Table
    - Add order_status field with states:
      - pending
      - processing
      - shipped
      - delivered
      - cancelled
    - Add tracking_number and shipping_carrier fields

  2. New Tables
    - returns: Store return requests
      - id (uuid, primary key)
      - order_id (references orders)
      - user_id (references auth.users)
      - reason (text)
      - status (pending, approved, rejected)
      - created_at, updated_at timestamps

  3. Security
    - Enable RLS on returns table
    - Add policies for user access control
*/

-- Update orders table with new tracking fields
DO $$ 
BEGIN
  -- Add order_status if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'order_status') 
  THEN
    ALTER TABLE orders 
    ADD COLUMN order_status text NOT NULL DEFAULT 'pending'
    CHECK (order_status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled'));
  END IF;

  -- Add tracking_number if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'tracking_number') 
  THEN
    ALTER TABLE orders ADD COLUMN tracking_number text;
  END IF;

  -- Add shipping_carrier if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'shipping_carrier') 
  THEN
    ALTER TABLE orders ADD COLUMN shipping_carrier text;
  END IF;
END $$;

-- Create returns table
CREATE TABLE IF NOT EXISTS returns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending'
  CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_returns_updated_at ON returns;
CREATE TRIGGER update_returns_updated_at
  BEFORE UPDATE ON returns
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE returns ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can create return requests for their orders" ON returns;
DROP POLICY IF EXISTS "Users can view their return requests" ON returns;

-- Create policies for returns table
CREATE POLICY "Users can create return requests for their orders"
  ON returns
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = returns.order_id
      AND orders.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view their return requests"
  ON returns
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_returns_order_id ON returns(order_id);
CREATE INDEX IF NOT EXISTS idx_returns_user_id ON returns(user_id);
CREATE INDEX IF NOT EXISTS idx_returns_status ON returns(status);