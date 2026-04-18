-- Make the bucket private
UPDATE storage.buckets SET public = false WHERE id = 'devis-attachments';

-- Drop any existing policies on this bucket (clean slate)
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname ILIKE '%devis-attachments%'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;

-- Authenticated-only access
CREATE POLICY "devis-attachments authenticated read"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'devis-attachments');

CREATE POLICY "devis-attachments authenticated insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'devis-attachments');

CREATE POLICY "devis-attachments authenticated update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'devis-attachments');

CREATE POLICY "devis-attachments authenticated delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'devis-attachments');