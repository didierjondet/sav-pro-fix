
CREATE TABLE public.help_bot_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  user_name text,
  messages jsonb NOT NULL DEFAULT '[]'::jsonb,
  escalated boolean NOT NULL DEFAULT false,
  escalation_summary text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.help_bot_conversations ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_help_bot_conversations_shop_id ON public.help_bot_conversations(shop_id);
CREATE INDEX idx_help_bot_conversations_created_at ON public.help_bot_conversations(created_at DESC);

-- Super admins can do everything
CREATE POLICY "Super admins can manage all bot conversations"
  ON public.help_bot_conversations FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Shop users can manage their own conversations
CREATE POLICY "Shop users can manage their bot conversations"
  ON public.help_bot_conversations FOR ALL
  TO authenticated
  USING (shop_id = get_current_user_shop_id() AND auth.uid() = user_id)
  WITH CHECK (shop_id = get_current_user_shop_id() AND auth.uid() = user_id);

-- Shop admins can view all conversations in their shop
CREATE POLICY "Shop admins can view shop bot conversations"
  ON public.help_bot_conversations FOR SELECT
  TO authenticated
  USING (shop_id = get_current_user_shop_id() AND is_shop_admin());

-- Trigger for updated_at
CREATE TRIGGER update_help_bot_conversations_updated_at
  BEFORE UPDATE ON public.help_bot_conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
