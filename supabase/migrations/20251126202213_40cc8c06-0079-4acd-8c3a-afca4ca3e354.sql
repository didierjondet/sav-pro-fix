-- Add show_carousel column to landing_content table
ALTER TABLE landing_content 
ADD COLUMN IF NOT EXISTS show_carousel boolean DEFAULT true;

COMMENT ON COLUMN landing_content.show_carousel IS 'Controls whether the carousel is displayed on the landing page';