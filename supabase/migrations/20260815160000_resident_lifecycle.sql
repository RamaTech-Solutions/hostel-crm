-- Sprint 4 resident lifecycle: atomic RPCs + one active assignment per resident.
-- Linked audit (2026-08-15): zero residents with >1 active assignment.

CREATE OR REPLACE FUNCTION public.release_bed_inventory_status(p_bed_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.bed_assignments a
    WHERE a.bed_id = p_bed_id
      AND a.is_active = true
      AND a.end_date IS NULL
  ) THEN
    RETURN;
  END IF;

  UPDATE public.beds b
  SET status = CASE
    WHEN b.status IN ('maintenance', 'reserved') THEN b.status
    ELSE 'available'::public.bed_status
  END
  WHERE b.id = p_bed_id;
END;
$$;

REVOKE ALL ON FUNCTION public.release_bed_inventory_status(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.onboard_resident(
  p_resident_id uuid,
  p_property_id uuid,
  p_room_id uuid,
  p_bed_id uuid,
  p_full_name text,
  p_mobile text,
  p_email text,
  p_gender text,
  p_date_of_birth date,
  p_permanent_address jsonb,
  p_id_type text,
  p_id_number_masked text,
  p_id_last_four text,
  p_company_college text,
  p_employee_student_id text,
  p_work_address text,
  p_joining_date date,
  p_planned_checkout_date date,
  p_monthly_rent numeric,
  p_security_deposit_amount numeric,
  p_remarks text,
  p_guardian_name text,
  p_guardian_relation text,
  p_guardian_phone text,
  p_emergency_name text,
  p_emergency_phone text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_org uuid;
  v_existing public.residents%ROWTYPE;
  v_assignment public.bed_assignments%ROWTYPE;
  v_property public.properties%ROWTYPE;
  v_room public.rooms%ROWTYPE;
  v_bed public.beds%ROWTYPE;
  v_assignment_id uuid;
  v_id_type public.id_type;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'You don''t have access to this property.');
  END IF;
  IF NOT public.can_user_write() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'You don''t have access to this property.');
  END IF;

  v_org := public.get_user_organization_id();
  IF v_org IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'You don''t have access to this property.');
  END IF;

  SELECT * INTO v_existing FROM public.residents r WHERE r.id = p_resident_id;
  IF FOUND THEN
    IF v_existing.organization_id IS DISTINCT FROM v_org OR NOT public.can_access_resident(p_resident_id) THEN
      RETURN jsonb_build_object('ok', false, 'error', 'You don''t have access to this property.');
    END IF;
    SELECT * INTO v_assignment
    FROM public.bed_assignments a
    WHERE a.resident_id = p_resident_id
      AND a.is_active = true
      AND a.end_date IS NULL
    LIMIT 1;
    IF v_assignment.bed_id IS NOT DISTINCT FROM p_bed_id
       AND v_existing.full_name IS NOT DISTINCT FROM p_full_name
       AND v_existing.mobile IS NOT DISTINCT FROM p_mobile
       AND v_existing.joining_date IS NOT DISTINCT FROM p_joining_date THEN
      RETURN jsonb_build_object('ok', true, 'resident_id', p_resident_id);
    END IF;
    RETURN jsonb_build_object('ok', false, 'error', 'This request doesn''t match the resident already saved. Refresh and try again.');
  END IF;

  IF p_property_id IS NULL OR p_property_id NOT IN (SELECT public.get_user_property_ids()) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'You don''t have access to this property.');
  END IF;

  SELECT * INTO v_property FROM public.properties p WHERE p.id = p_property_id;
  IF NOT FOUND OR v_property.organization_id IS DISTINCT FROM v_org OR v_property.status IS DISTINCT FROM 'active' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'This property is archived. Choose an active property.');
  END IF;

  SELECT * INTO v_room FROM public.rooms rm WHERE rm.id = p_room_id;
  IF NOT FOUND OR v_room.property_id IS DISTINCT FROM p_property_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'This bed is not available. Choose another bed.');
  END IF;

  SELECT * INTO v_bed FROM public.beds b WHERE b.id = p_bed_id;
  IF NOT FOUND OR v_bed.room_id IS DISTINCT FROM p_room_id OR v_bed.property_id IS DISTINCT FROM p_property_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'This bed is not available. Choose another bed.');
  END IF;
  IF v_bed.status IN ('maintenance', 'reserved') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'This bed is not available. Choose another bed.');
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.bed_assignments a
    WHERE a.bed_id = p_bed_id AND a.is_active = true AND a.end_date IS NULL
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'This bed has just been assigned to another resident. Choose another bed.');
  END IF;

  IF p_id_type IS NULL OR btrim(p_id_type) = '' THEN
    v_id_type := NULL;
  ELSE
    v_id_type := p_id_type::public.id_type;
  END IF;

  INSERT INTO public.residents (
    id, organization_id, property_id, full_name, date_of_birth, gender, mobile, email,
    permanent_address, id_type, id_number_masked, id_last_four, company_college,
    employee_student_id, work_address, joining_date, planned_checkout_date,
    monthly_rent, security_deposit_amount, agreement_status, status, remarks
  ) VALUES (
    p_resident_id, v_org, p_property_id, p_full_name, p_date_of_birth, NULLIF(p_gender, ''), p_mobile, NULLIF(p_email, ''),
    COALESCE(p_permanent_address, '{}'::jsonb), v_id_type, p_id_number_masked, p_id_last_four,
    NULLIF(p_company_college, ''), NULLIF(p_employee_student_id, ''), NULLIF(p_work_address, ''),
    p_joining_date, p_planned_checkout_date, COALESCE(p_monthly_rent, 0), COALESCE(p_security_deposit_amount, 0),
    'active', 'active', NULLIF(p_remarks, '')
  );

  IF p_guardian_name IS NOT NULL AND btrim(p_guardian_name) <> '' AND p_guardian_phone IS NOT NULL AND btrim(p_guardian_phone) <> '' THEN
    INSERT INTO public.resident_contacts (resident_id, organization_id, contact_type, name, relation, phone)
    VALUES (p_resident_id, v_org, 'guardian', p_guardian_name, NULLIF(p_guardian_relation, ''), p_guardian_phone);
  END IF;

  IF p_emergency_name IS NOT NULL AND btrim(p_emergency_name) <> '' AND p_emergency_phone IS NOT NULL AND btrim(p_emergency_phone) <> '' THEN
    INSERT INTO public.resident_contacts (resident_id, organization_id, contact_type, name, relation, phone)
    VALUES (p_resident_id, v_org, 'emergency', p_emergency_name, NULL, p_emergency_phone);
  END IF;

  INSERT INTO public.bed_assignments (
    resident_id, bed_id, room_id, property_id, organization_id, assigned_by, start_date, is_active
  ) VALUES (
    p_resident_id, p_bed_id, p_room_id, p_property_id, v_org, auth.uid(), p_joining_date, true
  )
  RETURNING id INTO v_assignment_id;

  UPDATE public.residents SET current_bed_assignment_id = v_assignment_id WHERE id = p_resident_id;
  UPDATE public.beds SET status = 'occupied' WHERE id = p_bed_id;

  IF COALESCE(p_security_deposit_amount, 0) > 0 THEN
    INSERT INTO public.security_deposits (resident_id, organization_id, amount_held, status)
    VALUES (p_resident_id, v_org, p_security_deposit_amount, 'held');
  END IF;

  RETURN jsonb_build_object('ok', true, 'resident_id', p_resident_id);
EXCEPTION
  WHEN unique_violation THEN
    IF SQLERRM ILIKE '%one_active_bed_assignment%' THEN
      RETURN jsonb_build_object('ok', false, 'error', 'This bed has just been assigned to another resident. Choose another bed.');
    END IF;
    IF SQLERRM ILIKE '%one_active_assignment_per_resident%' THEN
      RETURN jsonb_build_object('ok', false, 'error', 'This resident already has an active bed assignment. Use Transfer to change rooms.');
    END IF;
    RETURN jsonb_build_object('ok', false, 'error', 'We couldn''t add this resident. Please try again.');
END;
$$;

CREATE OR REPLACE FUNCTION public.transfer_resident(
  p_resident_id uuid,
  p_property_id uuid,
  p_room_id uuid,
  p_bed_id uuid,
  p_transfer_date date,
  p_reason text,
  p_notes text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_org uuid;
  v_resident public.residents%ROWTYPE;
  v_current public.bed_assignments%ROWTYPE;
  v_property public.properties%ROWTYPE;
  v_room public.rooms%ROWTYPE;
  v_bed public.beds%ROWTYPE;
  v_new_id uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT public.can_user_write() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'You don''t have access to this property.');
  END IF;
  v_org := public.get_user_organization_id();

  IF NOT public.can_access_resident(p_resident_id) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'You don''t have access to this property.');
  END IF;

  SELECT * INTO v_resident FROM public.residents r WHERE r.id = p_resident_id;
  IF NOT FOUND OR v_resident.organization_id IS DISTINCT FROM v_org THEN
    RETURN jsonb_build_object('ok', false, 'error', 'You don''t have access to this property.');
  END IF;
  IF v_resident.status = 'checked_out' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'This resident is already checked out.');
  END IF;

  IF p_property_id NOT IN (SELECT public.get_user_property_ids()) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'You don''t have access to this property.');
  END IF;

  SELECT * INTO v_property FROM public.properties p WHERE p.id = p_property_id;
  IF NOT FOUND OR v_property.status IS DISTINCT FROM 'active' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'This property is archived. Choose an active property.');
  END IF;

  SELECT * INTO v_current
  FROM public.bed_assignments a
  WHERE a.resident_id = p_resident_id AND a.is_active = true AND a.end_date IS NULL;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'We couldn''t transfer this resident. Their current assignment has not changed.');
  END IF;
  IF p_transfer_date < v_current.start_date THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Transfer date can''t be before the current stay started.');
  END IF;

  SELECT * INTO v_room FROM public.rooms rm WHERE rm.id = p_room_id;
  SELECT * INTO v_bed FROM public.beds b WHERE b.id = p_bed_id;
  IF v_room.property_id IS DISTINCT FROM p_property_id OR v_bed.room_id IS DISTINCT FROM p_room_id OR v_bed.property_id IS DISTINCT FROM p_property_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'This bed is not available. Choose another bed.');
  END IF;
  IF v_bed.status IN ('maintenance', 'reserved') OR EXISTS (
    SELECT 1 FROM public.bed_assignments a
    WHERE a.bed_id = p_bed_id AND a.is_active = true AND a.end_date IS NULL
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'That bed is no longer available. The resident''s current assignment has not changed.');
  END IF;

  UPDATE public.bed_assignments
  SET is_active = false, end_date = p_transfer_date
  WHERE id = v_current.id;

  PERFORM public.release_bed_inventory_status(v_current.bed_id);

  INSERT INTO public.bed_assignments (
    resident_id, bed_id, room_id, property_id, organization_id, assigned_by, start_date, is_active
  ) VALUES (
    p_resident_id, p_bed_id, p_room_id, p_property_id, v_org, auth.uid(), p_transfer_date, true
  )
  RETURNING id INTO v_new_id;

  UPDATE public.beds SET status = 'occupied' WHERE id = p_bed_id;
  UPDATE public.residents
  SET property_id = p_property_id, current_bed_assignment_id = v_new_id
  WHERE id = p_resident_id;

  INSERT INTO public.room_transfers (
    resident_id, from_bed_assignment_id, to_bed_assignment_id, organization_id, transferred_by, transfer_date, reason, notes
  ) VALUES (
    p_resident_id, v_current.id, v_new_id, v_org, auth.uid(), p_transfer_date, NULLIF(p_reason, ''), NULLIF(p_notes, '')
  );

  RETURN jsonb_build_object('ok', true, 'resident_id', p_resident_id);
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('ok', false, 'error', 'That bed is no longer available. The resident''s current assignment has not changed.');
  WHEN OTHERS THEN
    RETURN jsonb_build_object('ok', false, 'error', 'We couldn''t transfer this resident. Their current assignment has not changed.');
END;
$$;

CREATE OR REPLACE FUNCTION public.checkout_resident(
  p_resident_id uuid,
  p_checkout_date date,
  p_final_payment_amount numeric,
  p_deposit_refund numeric,
  p_deposit_deductions numeric,
  p_remarks text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_org uuid;
  v_resident public.residents%ROWTYPE;
  v_current public.bed_assignments%ROWTYPE;
  v_deposit public.security_deposits%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR NOT public.can_user_write() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'You don''t have access to this property.');
  END IF;
  v_org := public.get_user_organization_id();

  IF NOT public.can_access_resident(p_resident_id) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'You don''t have access to this property.');
  END IF;

  SELECT * INTO v_resident FROM public.residents r WHERE r.id = p_resident_id;
  IF NOT FOUND OR v_resident.organization_id IS DISTINCT FROM v_org THEN
    RETURN jsonb_build_object('ok', false, 'error', 'You don''t have access to this property.');
  END IF;

  IF v_resident.status = 'checked_out' THEN
    RETURN jsonb_build_object('ok', true, 'resident_id', p_resident_id, 'already_complete', true);
  END IF;

  SELECT * INTO v_current
  FROM public.bed_assignments a
  WHERE a.resident_id = p_resident_id AND a.is_active = true AND a.end_date IS NULL;

  IF FOUND THEN
    IF p_checkout_date < v_current.start_date THEN
      RETURN jsonb_build_object('ok', false, 'error', 'Checkout date can''t be before the current stay started.');
    END IF;
    UPDATE public.bed_assignments
    SET is_active = false, end_date = p_checkout_date
    WHERE id = v_current.id;
    PERFORM public.release_bed_inventory_status(v_current.bed_id);
  END IF;

  UPDATE public.residents
  SET
    status = 'checked_out',
    planned_checkout_date = p_checkout_date,
    current_bed_assignment_id = NULL,
    remarks = COALESCE(NULLIF(p_remarks, ''), remarks)
  WHERE id = p_resident_id;

  IF COALESCE(p_final_payment_amount, 0) > 0 AND v_resident.property_id IS NOT NULL THEN
    INSERT INTO public.payments (
      resident_id, property_id, organization_id, recorded_by, amount, payment_date,
      payment_type, payment_method, status, notes
    ) VALUES (
      p_resident_id, v_resident.property_id, v_org, auth.uid(), p_final_payment_amount, p_checkout_date,
      'rent', 'cash', 'paid', 'Final payment at checkout'
    );
  END IF;

  SELECT * INTO v_deposit FROM public.security_deposits d WHERE d.resident_id = p_resident_id LIMIT 1;
  IF FOUND THEN
    UPDATE public.security_deposits
    SET
      amount_refunded = COALESCE(p_deposit_refund, 0),
      deductions = COALESCE(p_deposit_deductions, 0),
      refund_date = p_checkout_date,
      status = 'refunded'
    WHERE id = v_deposit.id;
  END IF;

  RETURN jsonb_build_object('ok', true, 'resident_id', p_resident_id);
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('ok', false, 'error', 'We couldn''t complete checkout. Please try again.');
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS one_active_assignment_per_resident
  ON public.bed_assignments (resident_id)
  WHERE is_active = true AND end_date IS NULL;

REVOKE ALL ON FUNCTION public.onboard_resident(
  uuid, uuid, uuid, uuid, text, text, text, text, date, jsonb, text, text, text, text, text, text, date, date, numeric, numeric, text, text, text, text, text, text
) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.transfer_resident(uuid, uuid, uuid, uuid, date, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.checkout_resident(uuid, date, numeric, numeric, numeric, text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.onboard_resident(
  uuid, uuid, uuid, uuid, text, text, text, text, date, jsonb, text, text, text, text, text, text, date, date, numeric, numeric, text, text, text, text, text, text
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.transfer_resident(uuid, uuid, uuid, uuid, date, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.checkout_resident(uuid, date, numeric, numeric, numeric, text) TO authenticated;
