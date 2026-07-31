
-- 1. Remove public SELECT access
DROP POLICY IF EXISTS "Anyone can read devis attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can upload devis attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can delete devis attachments" ON storage.objects;

-- 2. Ownership scoping for destructive operations
DROP POLICY IF EXISTS "devis-attachments authenticated update" ON storage.objects;
DROP POLICY IF EXISTS "devis-attachments authenticated delete" ON storage.objects;

CREATE POLICY "devis-attachments owner or admin update"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'devis-attachments'
  AND (
    public.has_role(auth.uid(), 'administrateur')
    OR EXISTS (SELECT 1 FROM public.devis_attachments a WHERE a.file_path = storage.objects.name AND a.uploaded_by = auth.uid())
    OR EXISTS (SELECT 1 FROM public.rdv_attachments a WHERE a.file_path = storage.objects.name AND a.uploaded_by = auth.uid())
  )
)
WITH CHECK (bucket_id = 'devis-attachments');

CREATE POLICY "devis-attachments owner or admin delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'devis-attachments'
  AND (
    public.has_role(auth.uid(), 'administrateur')
    OR EXISTS (SELECT 1 FROM public.devis_attachments a WHERE a.file_path = storage.objects.name AND a.uploaded_by = auth.uid())
    OR EXISTS (SELECT 1 FROM public.rdv_attachments a WHERE a.file_path = storage.objects.name AND a.uploaded_by = auth.uid())
    -- allow cleanup of orphan objects (rollback of a failed metadata insert)
    OR (
      NOT EXISTS (SELECT 1 FROM public.devis_attachments a WHERE a.file_path = storage.objects.name)
      AND NOT EXISTS (SELECT 1 FROM public.rdv_attachments a WHERE a.file_path = storage.objects.name)
      AND storage.objects.owner = auth.uid()
    )
  )
);
