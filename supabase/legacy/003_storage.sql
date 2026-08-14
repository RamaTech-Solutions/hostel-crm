-- Storage bucket setup (run in Supabase Dashboard or SQL Editor)
-- Note: Bucket creation is typically done via Dashboard: Storage > New Bucket > resident-documents (private)

-- Storage policies for resident-documents bucket
CREATE POLICY "Authenticated users can read documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'resident-documents');

CREATE POLICY "Authenticated users can upload documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'resident-documents');

CREATE POLICY "Authenticated users can delete own org documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'resident-documents');
