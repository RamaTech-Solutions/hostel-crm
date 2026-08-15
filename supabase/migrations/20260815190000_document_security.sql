-- Sprint 6: resident-centric private documents. No object data to migrate (0 rows).
-- Canonical object name: {organization_id}/{resident_id}/{document_id}.{ext}
-- No Storage UPDATE policy: uploads use a new UUID, upsert false, never overwrite in place.
-- Magic-byte / content sniffing is deferred (P1); MIME + extension + bucket allowlist are enforced.

DROP POLICY IF EXISTS "Authenticated users can read documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete own org documents" ON storage.objects;
DROP POLICY IF EXISTS "storage_select" ON storage.objects;
DROP POLICY IF EXISTS "storage_insert" ON storage.objects;
DROP POLICY IF EXISTS "storage_update" ON storage.objects;
DROP POLICY IF EXISTS "storage_delete" ON storage.objects;

CREATE OR REPLACE FUNCTION public.storage_resident_id_from_object_name(p_name text)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_parts text[];
  v_org text;
  v_resident text;
  v_stem text;
  v_uuid_re constant text := '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';
BEGIN
  IF p_name IS NULL OR p_name = '' THEN
    RETURN NULL;
  END IF;
  v_parts := string_to_array(p_name, '/');
  IF array_length(v_parts, 1) IS DISTINCT FROM 3 THEN
    RETURN NULL;
  END IF;
  v_org := lower(v_parts[1]);
  v_resident := lower(v_parts[2]);
  IF lower(v_parts[3]) !~ ('^' || '[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}' || '\.(pdf|jpg|jpeg|png|webp)$') THEN
    RETURN NULL;
  END IF;
  v_stem := lower(split_part(v_parts[3], '.', 1));
  IF v_org !~ v_uuid_re OR v_resident !~ v_uuid_re OR v_stem !~ v_uuid_re THEN
    RETURN NULL;
  END IF;
  IF v_org IS DISTINCT FROM public.get_user_organization_id()::text THEN
    RETURN NULL;
  END IF;
  RETURN v_resident::uuid;
END;
$$;

REVOKE ALL ON FUNCTION public.storage_resident_id_from_object_name(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.storage_resident_id_from_object_name(text) TO authenticated;

CREATE UNIQUE INDEX IF NOT EXISTS resident_documents_storage_path_key
  ON public.resident_documents (storage_path);

DROP POLICY IF EXISTS "resident_documents_update" ON public.resident_documents;

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
  AND public.storage_resident_id_from_object_name(name) IS NOT NULL
  AND public.can_access_resident(public.storage_resident_id_from_object_name(name))
);

CREATE POLICY "resident_documents_insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'resident-documents'
  AND public.can_user_write()
  AND public.storage_resident_id_from_object_name(name) IS NOT NULL
  AND public.can_access_resident(public.storage_resident_id_from_object_name(name))
);

CREATE POLICY "resident_documents_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'resident-documents'
  AND public.can_user_write()
  AND public.storage_resident_id_from_object_name(name) IS NOT NULL
  AND public.can_access_resident(public.storage_resident_id_from_object_name(name))
);

UPDATE storage.buckets
SET
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
WHERE id = 'resident-documents';
