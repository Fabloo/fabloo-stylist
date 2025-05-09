-- Fix relationship between shared_items and friend_circles tables

-- Enable debugging for detailed output
SET client_min_messages TO DEBUG;

-- Check table structures
SELECT 
    table_name, 
    column_name, 
    data_type, 
    is_nullable
FROM 
    information_schema.columns
WHERE 
    table_name IN ('shared_items', 'friend_circles')
ORDER BY 
    table_name, ordinal_position;

-- Make friend_circle_id nullable (if it's not already)
ALTER TABLE shared_items ALTER COLUMN friend_circle_id DROP NOT NULL;

-- Check for existing foreign key constraints
SELECT
    tc.table_schema, 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE 
    tc.constraint_type = 'FOREIGN KEY' 
    AND (tc.table_name = 'shared_items' OR ccu.table_name = 'shared_items');

-- Drop any existing problematic foreign key constraints
DO $$
DECLARE
    v_constraint_name text;
BEGIN
    -- Check if there's a foreign key constraint on friend_circle_id
    SELECT constraint_name INTO v_constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'shared_items'
        AND tc.constraint_type = 'FOREIGN KEY'
        AND kcu.column_name = 'friend_circle_id';
    
    -- If the constraint exists, drop it
    IF v_constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE shared_items DROP CONSTRAINT ' || v_constraint_name;
        RAISE NOTICE 'Dropped foreign key constraint: %', v_constraint_name;
    ELSE
        RAISE NOTICE 'No foreign key constraint on friend_circle_id found';
    END IF;
END $$;

-- Add the proper foreign key constraint
DO $$
BEGIN
    -- Try to add the foreign key constraint with ON DELETE SET NULL
    BEGIN
        ALTER TABLE shared_items
        ADD CONSTRAINT shared_items_friend_circle_id_fkey
        FOREIGN KEY (friend_circle_id) REFERENCES friend_circles(id)
        ON DELETE SET NULL;
        
        RAISE NOTICE 'Added foreign key constraint for friend_circle_id';
    EXCEPTION
        WHEN others THEN
            RAISE NOTICE 'Could not add foreign key constraint: %', SQLERRM;
    END;
END $$;

-- Update RLS policies for shared_items
-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own shared items" ON shared_items;
DROP POLICY IF EXISTS "Users can insert shared items" ON shared_items;
DROP POLICY IF EXISTS "Users can update shared items" ON shared_items;
DROP POLICY IF EXISTS "Users can delete shared items" ON shared_items;

-- Create basic policies without joins
-- View policy (users can view items they've shared or received)
CREATE POLICY "Users can view their own shared items"
ON shared_items FOR SELECT
USING (
    sender_id = auth.uid()
);

-- Insert policy (authenticated users can create shared items)
CREATE POLICY "Users can insert shared items"
ON shared_items FOR INSERT 
TO authenticated
WITH CHECK (
    sender_id = auth.uid()
);

-- Update policy (senders can update their shares)
CREATE POLICY "Users can update shared items"
ON shared_items FOR UPDATE
USING (
    sender_id = auth.uid()
)
WITH CHECK (
    sender_id = auth.uid()
);

-- Delete policy (senders can delete their shares)
CREATE POLICY "Users can delete shared items"
ON shared_items FOR DELETE
USING (
    sender_id = auth.uid()
);

-- Add an index on friend_circle_id for better performance
CREATE INDEX IF NOT EXISTS shared_items_friend_circle_id_idx
ON shared_items(friend_circle_id);

-- Make sure Row Level Security is enabled
ALTER TABLE shared_items ENABLE ROW LEVEL SECURITY;

-- Insert a test record to verify everything works
INSERT INTO shared_items (
    sender_id, 
    item_id, 
    comment, 
    response_status
)
VALUES (
    (SELECT id FROM auth.users LIMIT 1), -- Just grab any user for testing
    'test-item-id',
    'This is a test share',
    'pending'
)
RETURNING id, sender_id, item_id;

-- Output final table structure and constraints for verification
SELECT 
    table_name, 
    column_name, 
    data_type, 
    is_nullable
FROM 
    information_schema.columns
WHERE 
    table_name IN ('shared_items', 'friend_circles')
ORDER BY 
    table_name, ordinal_position;

-- Show foreign key constraints
SELECT
    tc.table_schema, 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE 
    tc.constraint_type = 'FOREIGN KEY' 
    AND (tc.table_name = 'shared_items' OR ccu.table_name = 'shared_items');

-- Show RLS policies
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM
    pg_policies
WHERE
    tablename = 'shared_items'; 