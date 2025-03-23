/*
  # Fix inventory template and format

  1. Changes
    - Drop and recreate valid_inventory_format view with proper structure
    - Add more detailed field descriptions and validation rules
    - Ensure proper data types and constraints

  2. Format Rules
    - Clear field descriptions
    - Proper data type specifications
    - Validation requirements
*/

-- Drop existing view if it exists
DROP VIEW IF EXISTS valid_inventory_format;

-- Create improved view for inventory upload validation
CREATE OR REPLACE VIEW valid_inventory_format AS
WITH format_data AS (
  SELECT *
  FROM (
    VALUES
      ('Required Fields', 'name', 'text', 'Product name (1-100 characters)'),
      ('Required Fields', 'description', 'text', 'Product description (max 500 characters)'),
      ('Required Fields', 'price', 'numeric', 'Product price (greater than 0)'),
      ('Required Fields', 'image_url', 'text', 'Valid HTTPS URL for product image'),
      ('Required Fields', 'stock', 'integer', 'Available quantity (0 or greater)'),
      ('Required Fields', 'body_shapes', 'text[]', 'Array of body shapes ["hourglass", "pear", "rectangle", "inverted-triangle", "apple"]'),
      ('Required Fields', 'color_tones', 'text[]', 'Array of color seasons ["warm", "cool", "neutral"]'),
      ('Required Fields', 'dress_type', 'text', 'Type of dress (e.g., "wrap", "a-line", "sheath")'),
      ('Optional Fields', 'occasion_tags', 'text[]', 'Array of occasions ["casual", "formal", "party", "work", "vacation"]'),
      ('Optional Fields', 'style_tags', 'text[]', 'Array of styles ["classic", "modern", "bohemian", "elegant", "minimalist"]'),
      ('Optional Fields', 'seasonal_tags', 'text[]', 'Array of seasons ["spring", "summer", "fall", "winter"]'),
      ('Optional Fields', 'sizes', 'text[]', 'Array of sizes ["XS", "S", "M", "L", "XL", "XXL"]'),
      ('Optional Fields', 'fabric_composition', 'jsonb', 'Material composition as percentage object {"cotton": 95, "elastane": 5}'),
      ('Optional Fields', 'care_instructions', 'text[]', 'Array of care instructions ["machine wash", "dry clean", "hand wash"]')
    ) AS t(section, field, type, description)
)
SELECT 
  section,
  field,
  type,
  description
FROM format_data
ORDER BY 
  CASE section 
    WHEN 'Required Fields' THEN 1 
    WHEN 'Optional Fields' THEN 2 
    ELSE 3 
  END,
  field;

-- Add comment to view
COMMENT ON VIEW valid_inventory_format IS 'Reference for valid inventory upload format with field specifications and validation rules';