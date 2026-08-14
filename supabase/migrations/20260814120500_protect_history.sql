-- Prevent deleting a room/bed/property from erasing assignment and payment history.

DO $$
DECLARE
  rec record;
BEGIN
  FOR rec IN
    SELECT c.conname, a.attname
    FROM pg_constraint c
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)
    WHERE c.conrelid = 'public.bed_assignments'::regclass
      AND c.contype = 'f'
      AND a.attname IN ('bed_id', 'room_id', 'property_id')
  LOOP
    EXECUTE format('ALTER TABLE public.bed_assignments DROP CONSTRAINT %I', rec.conname);
  END LOOP;
END $$;

ALTER TABLE public.bed_assignments
  ADD CONSTRAINT bed_assignments_bed_id_fkey
    FOREIGN KEY (bed_id) REFERENCES public.beds(id) ON DELETE RESTRICT,
  ADD CONSTRAINT bed_assignments_room_id_fkey
    FOREIGN KEY (room_id) REFERENCES public.rooms(id) ON DELETE RESTRICT,
  ADD CONSTRAINT bed_assignments_property_id_fkey
    FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE RESTRICT;

DO $$
DECLARE
  rec record;
BEGIN
  FOR rec IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)
    WHERE c.conrelid = 'public.payments'::regclass
      AND c.contype = 'f'
      AND a.attname = 'property_id'
  LOOP
    EXECUTE format('ALTER TABLE public.payments DROP CONSTRAINT %I', rec.conname);
  END LOOP;
END $$;

ALTER TABLE public.payments
  ADD CONSTRAINT payments_property_id_fkey
    FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE RESTRICT;
