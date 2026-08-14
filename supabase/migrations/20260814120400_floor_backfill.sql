-- Attach existing rooms (floor_id IS NULL) to a default floor per property.
-- Does not change room, bed, or resident IDs.

INSERT INTO public.floors (property_id, organization_id, floor_number, label)
SELECT p.id, p.organization_id, 0, 'Ground / Unassigned'
FROM public.properties p
WHERE EXISTS (
  SELECT 1 FROM public.rooms r
  WHERE r.property_id = p.id AND r.floor_id IS NULL
)
AND NOT EXISTS (
  SELECT 1 FROM public.floors f
  WHERE f.property_id = p.id AND f.floor_number = 0
);

UPDATE public.rooms r
SET floor_id = f.id
FROM public.floors f
WHERE r.property_id = f.property_id
  AND f.floor_number = 0
  AND r.floor_id IS NULL;
