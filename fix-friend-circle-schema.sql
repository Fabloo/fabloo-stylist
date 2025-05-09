-- Check if the column exists before altering table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'friend_circles' 
        AND column_name = 'friend_phone'
    ) THEN
        -- If friend_email exists, rename it to friend_phone
        IF EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'friend_circles' 
            AND column_name = 'friend_email'
        ) THEN
            ALTER TABLE public.friend_circles RENAME COLUMN friend_email TO friend_phone;
            
            -- Create an index on the friend_phone column for better query performance
            CREATE INDEX IF NOT EXISTS idx_friend_circles_friend_phone 
            ON public.friend_circles(friend_phone);
            
            -- Make the user_id, friend_phone combination unique
            ALTER TABLE public.friend_circles 
            DROP CONSTRAINT IF EXISTS unique_user_friend_email;
            
            ALTER TABLE public.friend_circles 
            ADD CONSTRAINT unique_user_friend_phone UNIQUE (user_id, friend_phone);
        ELSE
            -- If neither exists, add the friend_phone column
            ALTER TABLE public.friend_circles ADD COLUMN friend_phone text NOT NULL DEFAULT '';
            
            -- Create an index on the friend_phone column
            CREATE INDEX IF NOT EXISTS idx_friend_circles_friend_phone 
            ON public.friend_circles(friend_phone);
            
            -- Make the user_id, friend_phone combination unique
            ALTER TABLE public.friend_circles ADD CONSTRAINT unique_user_friend_phone UNIQUE (user_id, friend_phone);
        END IF;
    END IF;
END $$;

-- Update the RLS policy if it's using friend_email
DROP POLICY IF EXISTS "Friends can view items shared with them" ON public.shared_items;
CREATE POLICY "Friends can view items shared with them"
  ON public.shared_items
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.friend_circles fc
    WHERE fc.id = shared_items.friend_circle_id
    AND fc.friend_phone = (current_setting('request.jwt.claims', true)::json->>'phone')
  ));

-- Grant permissions to ensure access
GRANT ALL ON public.friend_circles TO authenticated;
GRANT ALL ON public.shared_items TO authenticated;

-- Update all queries to use friend_circles(friend_name, friend_phone) instead of friend_email
-- This message will remind you to update the code
SELECT 'Migration complete. Remember to update code to use friend_phone instead of friend_email' AS message; 