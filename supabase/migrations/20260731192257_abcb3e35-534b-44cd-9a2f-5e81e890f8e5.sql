
CREATE POLICY "hermes tmp own read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'hermes-temporary-files' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "hermes tmp own insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'hermes-temporary-files' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "hermes tmp own delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'hermes-temporary-files' AND (storage.foldername(name))[1] = auth.uid()::text);
