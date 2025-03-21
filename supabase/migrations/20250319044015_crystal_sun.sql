/*
  # Enhanced Recommendation System and Inventory Management

  1. New Tables
    - `style_preferences`: Store user style preferences
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `preferred_styles` (text array)
      - `preferred_occasions` (text array)
      - `price_range` (numrange)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `item_categories`: Structured categories for inventory
      - `id` (uuid, primary key)
      - `name` (text)
      - `parent_id` (uuid, self-reference)
      - `created_at` (timestamp)

  2. Enhancements to item_attributes
    - Add structured attributes for better matching
    - Add occasion tags
    - Add style tags
    - Add seasonal tags

  3. Security
    - Enable RLS
    - Add appropriate policies
*/

-- Create style_preferences table
CREATE TABLE IF NOT EXISTS style_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  preferred_styles text[] NOT NULL DEFAULT '{}',
  preferred_occasions text[] NOT NULL DEFAULT '{}',
  price_range numrange,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_price_range CHECK (
    (price_range IS NULL) OR 
    (lower(price_range) >= 0 AND upper(price_range) > lower(price_range))
  )
);

-- Create item_categories table
CREATE TABLE IF NOT EXISTS item_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  parent_id uuid REFERENCES item_categories(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE(name, parent_id)
);

-- Add new columns to item_attributes
ALTER TABLE item_attributes
ADD COLUMN IF NOT EXISTS occasion_tags text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS style_tags text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS seasonal_tags text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS fit_type text,
ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES item_categories(id),
ADD COLUMN IF NOT EXISTS size_range text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS fabric_composition jsonb,
ADD COLUMN IF NOT EXISTS care_instructions text[] DEFAULT '{}';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_style_preferences_user_id ON style_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_item_attributes_occasion_tags ON item_attributes USING gin(occasion_tags);
CREATE INDEX IF NOT EXISTS idx_item_attributes_style_tags ON item_attributes USING gin(style_tags);
CREATE INDEX IF NOT EXISTS idx_item_attributes_seasonal_tags ON item_attributes USING gin(seasonal_tags);
CREATE INDEX IF NOT EXISTS idx_item_attributes_category ON item_attributes(category_id);

-- Enable RLS
ALTER TABLE style_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_categories ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage their style preferences"
  ON style_preferences
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can view item categories"
  ON item_categories
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Only admins can modify item categories"
  ON item_categories
  FOR ALL
  TO authenticated
  USING ((auth.jwt() ->> 'role'::text) = 'admin'::text)
  WITH CHECK ((auth.jwt() ->> 'role'::text) = 'admin'::text);

-- Insert base categories
INSERT INTO item_categories (name) VALUES
  ('Dresses'),
  ('Tops'),
  ('Bottoms'),
  ('Outerwear'),
  ('Accessories')
ON CONFLICT (name, parent_id) DO NOTHING;

-- Insert dress subcategories
WITH dress_id AS (
  SELECT id FROM item_categories WHERE name = 'Dresses'
)
INSERT INTO item_categories (name, parent_id)
SELECT name, dress_id.id
FROM (
  VALUES 
    ('Maxi Dresses'),
    ('Midi Dresses'),
    ('Mini Dresses'),
    ('A-Line Dresses'),
    ('Wrap Dresses'),
    ('Shift Dresses'),
    ('Bodycon Dresses')
) AS subcats(name)
CROSS JOIN dress_id
ON CONFLICT (name, parent_id) DO NOTHING;

-- Create function for weighted recommendations
CREATE OR REPLACE FUNCTION get_personalized_recommendations(
  p_user_id uuid,
  p_limit integer DEFAULT 10
)
RETURNS TABLE (
  item_id uuid,
  score float
) AS $$
DECLARE
  user_body_shape text;
  user_skin_tone jsonb;
  user_preferences record;
BEGIN
  -- Get user's profile data
  SELECT body_shape, skin_tone INTO user_body_shape, user_skin_tone
  FROM profiles
  WHERE id = p_user_id;

  -- Get user's style preferences
  SELECT * INTO user_preferences
  FROM style_preferences
  WHERE user_id = p_user_id;

  RETURN QUERY
  WITH item_scores AS (
    SELECT 
      i.id,
      -- Base score starts at 1.0
      1.0 +
      -- Body shape match: +0.3
      CASE WHEN user_body_shape = ANY(a.body_shapes) THEN 0.3 ELSE 0 END +
      -- Color tone match: +0.3
      CASE WHEN user_skin_tone->>'season' = ANY(a.color_tones) THEN 0.3 ELSE 0 END +
      -- Style tags match: +0.2 per match
      (SELECT COALESCE(COUNT(*) * 0.2, 0)
       FROM unnest(user_preferences.preferred_styles) ps
       WHERE ps = ANY(a.style_tags)) +
      -- Occasion tags match: +0.2 per match
      (SELECT COALESCE(COUNT(*) * 0.2, 0)
       FROM unnest(user_preferences.preferred_occasions) po
       WHERE po = ANY(a.occasion_tags)) +
      -- Price range match: +0.2
      CASE WHEN i.price <@ user_preferences.price_range THEN 0.2 ELSE 0 END +
      -- Seasonal relevance: +0.2
      CASE WHEN 
        EXTRACT(MONTH FROM CURRENT_DATE) IN (12,1,2) AND 'winter' = ANY(a.seasonal_tags) OR
        EXTRACT(MONTH FROM CURRENT_DATE) IN (3,4,5) AND 'spring' = ANY(a.seasonal_tags) OR
        EXTRACT(MONTH FROM CURRENT_DATE) IN (6,7,8) AND 'summer' = ANY(a.seasonal_tags) OR
        EXTRACT(MONTH FROM CURRENT_DATE) IN (9,10,11) AND 'fall' = ANY(a.seasonal_tags)
      THEN 0.2 ELSE 0 END +
      -- Stock availability bonus: +0.1 for well-stocked items
      CASE WHEN i.stock > 5 THEN 0.1 ELSE 0 END
      AS score
    FROM inventory_items i
    JOIN item_attributes a ON i.id = a.item_id
    WHERE i.stock > 0  -- Only show in-stock items
  )
  SELECT 
    id,
    score
  FROM item_scores
  ORDER BY score DESC, id  -- Include id in ORDER BY for consistent results
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Create view for inventory upload validation
CREATE OR REPLACE VIEW valid_inventory_format AS
SELECT 
  'Required Fields:'::text AS section,
  'name'::text AS field,
  'text'::text AS type,
  'Product name'::text AS description
UNION ALL SELECT '', 'description', 'text', 'Product description'
UNION ALL SELECT '', 'price', 'numeric', 'Product price (> 0)'
UNION ALL SELECT '', 'image_url', 'text', 'Product image URL'
UNION ALL SELECT '', 'stock', 'integer', 'Available quantity'
UNION ALL SELECT '', 'body_shapes', 'text[]', 'Array of compatible body shapes'
UNION ALL SELECT '', 'color_tones', 'text[]', 'Array of compatible color seasons'
UNION ALL SELECT '', 'dress_type', 'text', 'Type of dress'
UNION ALL SELECT 
  'Optional Fields:',
  'occasion_tags',
  'text[]',
  'Array of occasions (e.g., casual, formal, party)'
UNION ALL SELECT 
  '',
  'style_tags',
  'text[]',
  'Array of style descriptors (e.g., bohemian, classic, modern)'
UNION ALL SELECT 
  '',
  'seasonal_tags',
  'text[]',
  'Array of seasons (spring, summer, fall, winter)'
UNION ALL SELECT 
  '',
  'size_range',
  'text[]',
  'Array of available sizes'
UNION ALL SELECT 
  '',
  'fabric_composition',
  'jsonb',
  'Material composition as JSON (e.g., {"cotton": 95, "elastane": 5})';

COMMENT ON VIEW valid_inventory_format IS 'Reference for valid inventory upload format';