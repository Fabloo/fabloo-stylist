ALTER TABLE inventory_items 
ADD COLUMN IF NOT EXISTS sizes text[] NOT NULL DEFAULT '{}'; 