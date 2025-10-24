-- Create the invoices storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'invoices',
  'invoices',
  false,
  10485760, -- 10MB in bytes
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['application/pdf'];

-- Policy 1: Super admins can view all invoices
CREATE POLICY "Super admins can view all invoices"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'invoices' 
  AND is_super_admin(auth.uid())
);

-- Policy 2: Super admins can upload invoices
CREATE POLICY "Super admins can upload invoices"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'invoices' 
  AND is_super_admin(auth.uid())
);

-- Policy 3: Shops can view their own invoices
CREATE POLICY "Shops can view their own invoices"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'invoices'
  AND (storage.foldername(name))[1] = (
    SELECT shop_id::text 
    FROM public.profiles 
    WHERE user_id = auth.uid()
    LIMIT 1
  )
);

-- Policy 4: Super admins can delete invoices if needed
CREATE POLICY "Super admins can delete invoices"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'invoices' 
  AND is_super_admin(auth.uid())
);