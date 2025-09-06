-- Ajouter le support des fichiers uploadés pour le carousel
-- Créer le bucket de stockage pour les médias du carousel
INSERT INTO storage.buckets (id, name, public) 
VALUES ('carousel-media', 'carousel-media', true)
ON CONFLICT (id) DO NOTHING;

-- Ajouter une colonne pour les fichiers uploadés
ALTER TABLE public.carousel_items 
ADD COLUMN IF NOT EXISTS file_url TEXT;

-- Politique pour permettre aux super admins de gérer les fichiers du carousel
CREATE POLICY "Super admins can upload carousel media" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'carousel-media' AND is_super_admin());

CREATE POLICY "Super admins can update carousel media" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'carousel-media' AND is_super_admin());

CREATE POLICY "Super admins can delete carousel media" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'carousel-media' AND is_super_admin());

CREATE POLICY "Everyone can view carousel media" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'carousel-media');