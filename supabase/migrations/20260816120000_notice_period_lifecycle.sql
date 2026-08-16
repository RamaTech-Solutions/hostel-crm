-- Notice vs complete checkout: give/update/cancel notice keep the bed occupied.
-- Restore stay is owner-only recovery. Checkout requires notice_period.
-- Do not reverse payments, charges, deposits, documents, or activity.

CREATE OR REPLACE FUNCTION public.give_resident_notice(
  p_resident_id uuid,
  p_planned_checkout_date date,
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

  IF v_resident.status NOT IN ('active', 'notice_period') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'This resident can''t be put on notice.');
  END IF;

  IF p_planned_checkout_date IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Notice date can''t be before the current stay started.');
  END IF;

  SELECT * INTO v_current
  FROM public.bed_assignments a
  WHERE a.resident_id = p_resident_id AND a.is_active = true AND a.end_date IS NULL;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'This resident does not have an active stay.');
  END IF;

  IF p_planned_checkout_date < v_current.start_date THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Notice date can''t be before the current stay started.');
  END IF;

  UPDATE public.residents
  SET
    status = 'notice_period',
    planned_checkout_date = p_planned_checkout_date,
    remarks = COALESCE(NULLIF(p_remarks, ''), remarks)
  WHERE id = p_resident_id;

  RETURN jsonb_build_object('ok', true, 'resident_id', p_resident_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_resident_notice(p_resident_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_org uuid;
  v_resident public.residents%ROWTYPE;
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

  IF v_resident.status IS DISTINCT FROM 'notice_period' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'This resident is not on notice.');
  END IF;

  UPDATE public.residents
  SET
    status = 'active',
    planned_checkout_date = NULL
  WHERE id = p_resident_id;

  RETURN jsonb_build_object('ok', true, 'resident_id', p_resident_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.restore_resident_stay(p_resident_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_org uuid;
  v_resident public.residents%ROWTYPE;
  v_last public.bed_assignments%ROWTYPE;
  v_bed public.beds%ROWTYPE;
  v_property public.properties%ROWTYPE;
  v_planned date;
BEGIN
  IF auth.uid() IS NULL OR NOT public.can_user_own() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'You don''t have access to this property.');
  END IF;
  v_org := public.get_user_organization_id();

  SELECT * INTO v_resident FROM public.residents r WHERE r.id = p_resident_id;
  IF NOT FOUND OR v_resident.organization_id IS DISTINCT FROM v_org THEN
    RETURN jsonb_build_object('ok', false, 'error', 'You don''t have access to this property.');
  END IF;

  IF v_resident.status IS DISTINCT FROM 'checked_out' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Only a checked-out stay can be restored.');
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.bed_assignments a
    WHERE a.resident_id = p_resident_id AND a.is_active = true AND a.end_date IS NULL
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'This resident already has an active stay.');
  END IF;

  SELECT * INTO v_last
  FROM public.bed_assignments a
  WHERE a.resident_id = p_resident_id
  ORDER BY a.start_date DESC, a.created_at DESC
  LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'This stay can''t be restored.');
  END IF;

  SELECT * INTO v_bed FROM public.beds b WHERE b.id = v_last.bed_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'This stay can''t be restored.');
  END IF;

  SELECT * INTO v_property FROM public.properties p WHERE p.id = v_last.property_id;
  IF NOT FOUND OR v_property.status IS DISTINCT FROM 'active' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'This property is archived. Choose an active property.');
  END IF;

  IF v_bed.status IN ('maintenance', 'reserved') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'This bed is not available. Choose another bed.');
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.bed_assignments a
    WHERE a.bed_id = v_last.bed_id AND a.is_active = true AND a.end_date IS NULL
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'This bed has just been assigned to another resident. Choose another bed.');
  END IF;

  v_planned := COALESCE(v_resident.planned_checkout_date, v_last.end_date);

  UPDATE public.bed_assignments
  SET is_active = true, end_date = NULL
  WHERE id = v_last.id;

  UPDATE public.beds SET status = 'occupied' WHERE id = v_last.bed_id;

  UPDATE public.residents
  SET
    status = 'notice_period',
    planned_checkout_date = v_planned,
    current_bed_assignment_id = v_last.id
  WHERE id = p_resident_id;

  RETURN jsonb_build_object('ok', true, 'resident_id', p_resident_id);
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

  IF v_resident.status IS DISTINCT FROM 'notice_period' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Give notice before completing checkout.');
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

REVOKE ALL ON FUNCTION public.give_resident_notice(uuid, date, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cancel_resident_notice(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.restore_resident_stay(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.checkout_resident(uuid, date, numeric, numeric, numeric, text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.give_resident_notice(uuid, date, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_resident_notice(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.restore_resident_stay(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.checkout_resident(uuid, date, numeric, numeric, numeric, text) TO authenticated;
