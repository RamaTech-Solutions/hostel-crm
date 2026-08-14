-- P0: Storage isolation by organization and assigned property path segments.
-- Object names: {organization_id}/{property_id}/{resident_id}/{filename}

DROP POLICY IF EXISTS "Authenticated users can read documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete own org documents" ON storage.objects;
DROP POLICY IF EXISTS "storage_select" ON storage.objects;
DROP POLICY IF EXISTS "storage_insert" ON storage.objects;
DROP POLICY IF EXISTS "storage_update" ON storage.objects;
DROP POLICY IF EXISTS "storage_delete" ON storage.objects;
DROP POLICY IF EXISTS "resident_documents_select" ON storage.objects;
DROP POLICY IF EXISTS "resident_documents_insert" ON storage.objects;
DROP POLICY IF EXISTS "resident_documents_update" ON storage.objects;
DROP POLICY IF EXISTS "resident_documents_delete" ON storage.objects;

CREATE POLICY "resident_documents_select"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'resident-documents'
  AND (storage.foldername(name))[1] = public.get_user_organization_id()::text
  AND (
    public.get_user_role() = 'owner'
    OR (
      (storage.foldername(name))[2] IS NOT NULL
      AND ((storage.foldername(name))[2])::uuid IN (SELECT public.get_user_property_ids())
    )
  )
);

CREATE POLICY "resident_documents_insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'resident-documents'
  AND public.can_user_write()
  AND (storage.foldername(name))[1] = public.get_user_organization_id()::text
  AND (
    public.get_user_role() = 'owner'
    OR (
      (storage.foldername(name))[2] IS NOT NULL
      AND ((storage.foldername(name))[2])::uuid IN (SELECT public.get_user_property_ids())
    )
  )
);

CREATE POLICY "resident_documents_update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'resident-documents'
  AND public.can_user_write()
  AND (storage.foldername(name))[1] = public.get_user_organization_id()::text
  AND (
    public.get_user_role() = 'owner'
    OR (
      (storage.foldername(name))[2] IS NOT NULL
      AND ((storage.foldername(name))[2])::uuid IN (SELECT public.get_user_property_ids())
    )
  )
)
WITH CHECK (
  bucket_id = 'resident-documents'
  AND public.can_user_write()
  AND (storage.foldername(name))[1] = public.get_user_organization_id()::text
  AND (
    public.get_user_role() = 'owner'
    OR (
      (storage.foldername(name))[2] IS NOT NULL
      AND ((storage.foldername(name))[2])::uuid IN (SELECT public.get_user_property_ids())
    )
  )
);

CREATE POLICY "resident_documents_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'resident-documents'
  AND public.can_user_write()
  AND (storage.foldername(name))[1] = public.get_user_organization_id()::text
  AND (
    public.get_user_role() = 'owner'
    OR (
      (storage.foldername(name))[2] IS NOT NULL
      AND ((storage.foldername(name))[2])::uuid IN (SELECT public.get_user_property_ids())
    )
  )
);
