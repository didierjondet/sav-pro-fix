-- Create table for custom widgets created via AI
CREATE TABLE custom_widgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  
  -- Basic information
  name TEXT NOT NULL,
  description TEXT,
  
  -- AI prompt and configuration
  original_prompt TEXT NOT NULL,
  ai_interpretation JSONB NOT NULL,
  
  -- Widget type and configuration
  widget_type TEXT NOT NULL CHECK (widget_type IN ('kpi', 'chart', 'table', 'custom')),
  chart_type TEXT CHECK (chart_type IN ('line', 'bar', 'pie', 'area', 'radar', 'composed')),
  
  -- Data configuration
  data_source TEXT NOT NULL,
  data_config JSONB NOT NULL,
  
  -- Display configuration
  display_config JSONB,
  
  -- Metadata
  enabled BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for performance
CREATE INDEX idx_custom_widgets_shop_id ON custom_widgets(shop_id);
CREATE INDEX idx_custom_widgets_enabled ON custom_widgets(enabled);
CREATE INDEX idx_custom_widgets_order ON custom_widgets(shop_id, display_order) WHERE enabled = true;

-- Enable Row Level Security
ALTER TABLE custom_widgets ENABLE ROW LEVEL SECURITY;

-- Users can view their shop's custom widgets
CREATE POLICY "Users can view their shop's custom widgets"
  ON custom_widgets FOR SELECT
  USING (
    shop_id IN (
      SELECT shop_id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- Admins can insert custom widgets for their shop
CREATE POLICY "Admins can insert their shop's custom widgets"
  ON custom_widgets FOR INSERT
  WITH CHECK (
    shop_id IN (
      SELECT shop_id FROM profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- Admins can update their shop's custom widgets
CREATE POLICY "Admins can update their shop's custom widgets"
  ON custom_widgets FOR UPDATE
  USING (
    shop_id IN (
      SELECT shop_id FROM profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- Admins can delete their shop's custom widgets
CREATE POLICY "Admins can delete their shop's custom widgets"
  ON custom_widgets FOR DELETE
  USING (
    shop_id IN (
      SELECT shop_id FROM profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_custom_widgets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for automatic timestamp updates
CREATE TRIGGER update_custom_widgets_updated_at_trigger
  BEFORE UPDATE ON custom_widgets
  FOR EACH ROW
  EXECUTE FUNCTION update_custom_widgets_updated_at();