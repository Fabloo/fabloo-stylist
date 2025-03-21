/*
  # Create orders and payment tables

  1. New Tables
    - `orders`: Stores order information
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `status` (text)
      - `total_amount` (numeric)
      - `payment_status` (text)
      - `payment_method` (text)
      - `shipping_address` (jsonb)
      - timestamps

    - `order_items`: Stores items in each order
      - `id` (uuid, primary key)
      - `order_id` (uuid, references orders)
      - `item_id` (uuid, references inventory_items)
      - `quantity` (integer)
      - `price` (numeric)
      - timestamps

  2. Security
    - Enable RLS on both tables
    - Users can only access their own orders
*/

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  total_amount numeric NOT NULL CHECK (total_amount >= 0),
  payment_status text NOT NULL DEFAULT 'pending',
  payment_method text,
  shipping_address jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create order_items table
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  item_id uuid REFERENCES inventory_items(id) ON DELETE CASCADE,
  quantity integer NOT NULL CHECK (quantity > 0),
  price numeric NOT NULL CHECK (price >= 0),
  created_at timestamptz DEFAULT now()
);

-- Create indexes if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_orders_user_id') THEN
    CREATE INDEX idx_orders_user_id ON orders(user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_orders_status') THEN
    CREATE INDEX idx_orders_status ON orders(status);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_orders_payment_status') THEN
    CREATE INDEX idx_orders_payment_status ON orders(payment_status);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_order_items_order_id') THEN
    CREATE INDEX idx_order_items_order_id ON order_items(order_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_order_items_item_id') THEN
    CREATE INDEX idx_order_items_item_id ON order_items(item_id);
  END IF;
END $$;

-- Enable RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Create policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'orders' 
    AND policyname = 'Users can view and create their own orders'
  ) THEN
    CREATE POLICY "Users can view and create their own orders"
      ON orders
      FOR ALL
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'order_items' 
    AND policyname = 'Users can view their own order items'
  ) THEN
    CREATE POLICY "Users can view their own order items"
      ON order_items
      FOR SELECT
      TO authenticated
      USING (EXISTS (
        SELECT 1 FROM orders
        WHERE orders.id = order_items.order_id
        AND orders.user_id = auth.uid()
      ));
  END IF;
END $$;

-- Create trigger for updated_at if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_orders_updated_at'
  ) THEN
    CREATE TRIGGER update_orders_updated_at
      BEFORE UPDATE ON orders
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;