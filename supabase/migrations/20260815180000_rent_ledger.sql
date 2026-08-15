-- Sprint 5 rent ledger. Do not rewrite existing payment rows.

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS rent_due_day smallint NOT NULL DEFAULT 5;

ALTER TABLE public.organizations
  DROP CONSTRAINT IF EXISTS organizations_rent_due_day_check;

ALTER TABLE public.organizations
  ADD CONSTRAINT organizations_rent_due_day_check
  CHECK (rent_due_day >= 1 AND rent_due_day <= 28);

CREATE TABLE IF NOT EXISTS public.rent_charges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES public.properties(id),
  resident_id uuid NOT NULL REFERENCES public.residents(id),
  charge_kind text NOT NULL DEFAULT 'monthly_rent' CHECK (charge_kind = 'monthly_rent'),
  period_start date NOT NULL,
  period_end date NOT NULL,
  due_date date NOT NULL,
  amount_due numeric(10,2) NOT NULL,
  notes text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  voided_at timestamptz,
  voided_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  void_reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT rent_charges_amount_due_check CHECK (amount_due > 0),
  CONSTRAINT rent_charges_period_start_month CHECK (period_start = date_trunc('month', period_start)::date),
  CONSTRAINT rent_charges_period_end_check CHECK (
    period_end >= period_start
    AND period_end = (date_trunc('month', period_start) + interval '1 month - 1 day')::date
  ),
  CONSTRAINT rent_charges_due_date_check CHECK (due_date >= period_start AND due_date <= period_end)
);

CREATE INDEX IF NOT EXISTS idx_rent_charges_org ON public.rent_charges(organization_id);
CREATE INDEX IF NOT EXISTS idx_rent_charges_property ON public.rent_charges(property_id);
CREATE INDEX IF NOT EXISTS idx_rent_charges_resident ON public.rent_charges(resident_id);
CREATE INDEX IF NOT EXISTS idx_rent_charges_period ON public.rent_charges(period_start);
CREATE INDEX IF NOT EXISTS idx_rent_charges_due ON public.rent_charges(due_date);

CREATE UNIQUE INDEX IF NOT EXISTS one_rent_charge_per_resident_period
  ON public.rent_charges (resident_id, period_start, charge_kind)
  WHERE voided_at IS NULL;

DROP TRIGGER IF EXISTS rent_charges_updated_at ON public.rent_charges;
CREATE TRIGGER rent_charges_updated_at BEFORE UPDATE ON public.rent_charges
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS rent_charge_id uuid REFERENCES public.rent_charges(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_payments_rent_charge ON public.payments(rent_charge_id);

CREATE OR REPLACE VIEW public.rent_charge_balances
WITH (security_invoker = true) AS
SELECT
  c.id,
  c.organization_id,
  c.property_id,
  c.resident_id,
  c.charge_kind,
  c.period_start,
  c.period_end,
  c.due_date,
  c.amount_due,
  c.notes,
  c.voided_at,
  c.created_at,
  COALESCE((
    SELECT SUM(p.amount)
    FROM public.payments p
    WHERE p.rent_charge_id = c.id
      AND p.payment_type = 'rent'
      AND p.status IN ('paid', 'partial')
  ), 0)::numeric(10,2) AS allocated_paid,
  GREATEST(
    c.amount_due - COALESCE((
      SELECT SUM(p.amount)
      FROM public.payments p
      WHERE p.rent_charge_id = c.id
        AND p.payment_type = 'rent'
        AND p.status IN ('paid', 'partial')
    ), 0),
    0
  )::numeric(10,2) AS outstanding,
  CASE
    WHEN c.voided_at IS NOT NULL THEN 'voided'
    WHEN GREATEST(
      c.amount_due - COALESCE((
        SELECT SUM(p.amount)
        FROM public.payments p
        WHERE p.rent_charge_id = c.id
          AND p.payment_type = 'rent'
          AND p.status IN ('paid', 'partial')
      ), 0),
      0
    ) <= 0 THEN 'paid'
    WHEN COALESCE((
      SELECT SUM(p.amount)
      FROM public.payments p
      WHERE p.rent_charge_id = c.id
        AND p.payment_type = 'rent'
        AND p.status IN ('paid', 'partial')
    ), 0) > 0 THEN 'partial'
    WHEN c.due_date < CURRENT_DATE THEN 'overdue'
    ELSE 'due'
  END AS ledger_status
FROM public.rent_charges c;

CREATE OR REPLACE FUNCTION public.protect_payment_immutability()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Recorded payments cannot be deleted.';
  END IF;
  IF NEW.amount IS DISTINCT FROM OLD.amount
    OR NEW.resident_id IS DISTINCT FROM OLD.resident_id
    OR NEW.property_id IS DISTINCT FROM OLD.property_id
    OR NEW.rent_charge_id IS DISTINCT FROM OLD.rent_charge_id
    OR NEW.payment_type IS DISTINCT FROM OLD.payment_type
    OR NEW.rent_month IS DISTINCT FROM OLD.rent_month
    OR NEW.payment_date IS DISTINCT FROM OLD.payment_date
    OR NEW.organization_id IS DISTINCT FROM OLD.organization_id
    OR NEW.status IS DISTINCT FROM OLD.status
    OR NEW.payment_method IS DISTINCT FROM OLD.payment_method
  THEN
    RAISE EXCEPTION 'Recorded payments cannot be changed. Notes and reference only.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS payments_protect_immutability ON public.payments;
CREATE TRIGGER payments_protect_immutability
  BEFORE UPDATE OR DELETE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.protect_payment_immutability();

CREATE OR REPLACE FUNCTION public.rent_charge_due_date(
  p_period_start date,
  p_due_day smallint,
  p_joining_date date
)
RETURNS date
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT CASE
    WHEN date_trunc('month', p_joining_date)::date = p_period_start
      THEN GREATEST(
        (p_period_start + (GREATEST(p_due_day, 1) - 1)),
        p_joining_date
      )
    ELSE p_period_start + (GREATEST(p_due_day, 1) - 1)
  END;
$$;

CREATE OR REPLACE FUNCTION public.generate_rent_charges(p_period_start date)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_org uuid;
  v_period_start date;
  v_period_end date;
  v_due_day smallint;
  v_created int := 0;
  v_skipped int := 0;
  v_row record;
BEGIN
  IF auth.uid() IS NULL OR NOT public.can_user_write() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'You don''t have access to generate rent.');
  END IF;

  v_org := public.get_user_organization_id();
  v_period_start := date_trunc('month', COALESCE(p_period_start, CURRENT_DATE))::date;
  IF v_period_start <> date_trunc('month', CURRENT_DATE)::date THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Rent can only be generated for the current month.');
  END IF;
  v_period_end := (v_period_start + interval '1 month - 1 day')::date;

  SELECT o.rent_due_day INTO v_due_day FROM public.organizations o WHERE o.id = v_org;
  v_due_day := COALESCE(v_due_day, 5);

  FOR v_row IN
    SELECT
      r.id AS resident_id,
      r.property_id,
      r.monthly_rent,
      r.joining_date
    FROM public.residents r
    JOIN public.properties p ON p.id = r.property_id
    WHERE r.organization_id = v_org
      AND r.status IN ('active', 'notice_period')
      AND r.monthly_rent > 0
      AND r.property_id IS NOT NULL
      AND r.joining_date <= v_period_end
      AND p.status = 'active'
      AND r.property_id IN (SELECT public.get_user_property_ids())
  LOOP
    BEGIN
      INSERT INTO public.rent_charges (
        organization_id, property_id, resident_id, charge_kind,
        period_start, period_end, due_date, amount_due, created_by
      ) VALUES (
        v_org,
        v_row.property_id,
        v_row.resident_id,
        'monthly_rent',
        v_period_start,
        v_period_end,
        public.rent_charge_due_date(v_period_start, v_due_day, v_row.joining_date),
        ROUND(v_row.monthly_rent, 2),
        auth.uid()
      );
      v_created := v_created + 1;
    EXCEPTION
      WHEN unique_violation THEN
        v_skipped := v_skipped + 1;
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'ok', true,
    'created_count', v_created,
    'skipped_count', v_skipped,
    'period_start', v_period_start
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.record_resident_payment(
  p_payment_id uuid,
  p_resident_id uuid,
  p_property_id uuid,
  p_amount numeric,
  p_payment_date date,
  p_payment_type text,
  p_payment_method text,
  p_transaction_reference text,
  p_rent_charge_id uuid,
  p_notes text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_org uuid;
  v_existing public.payments%ROWTYPE;
  v_resident public.residents%ROWTYPE;
  v_charge public.rent_charges%ROWTYPE;
  v_amount numeric(10,2);
  v_type public.payment_type;
  v_method public.payment_method;
  v_outstanding numeric(10,2);
  v_charge_id uuid;
  v_rent_month date;
BEGIN
  IF auth.uid() IS NULL OR NOT public.can_user_write() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'You don''t have access to record payments.');
  END IF;
  IF p_payment_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Payment id is required.');
  END IF;

  v_org := public.get_user_organization_id();
  v_amount := ROUND(COALESCE(p_amount, 0), 2);
  IF v_amount <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Amount must be greater than zero.');
  END IF;

  BEGIN
    v_type := p_payment_type::public.payment_type;
    v_method := p_payment_method::public.payment_method;
  EXCEPTION
    WHEN OTHERS THEN
      RETURN jsonb_build_object('ok', false, 'error', 'Choose a valid payment type and method.');
  END;

  SELECT * INTO v_existing FROM public.payments p WHERE p.id = p_payment_id;
  IF FOUND THEN
    IF v_existing.organization_id = v_org
      AND v_existing.resident_id = p_resident_id
      AND v_existing.property_id = p_property_id
      AND v_existing.amount = v_amount
      AND v_existing.payment_date = p_payment_date
      AND v_existing.payment_type = v_type
      AND v_existing.payment_method = v_method
      AND v_existing.rent_charge_id IS NOT DISTINCT FROM p_rent_charge_id
    THEN
      RETURN jsonb_build_object('ok', true, 'payment_id', v_existing.id, 'replay', true);
    END IF;
    RETURN jsonb_build_object('ok', false, 'error', 'This request doesn''t match the payment already saved. Refresh and try again.');
  END IF;

  SELECT * INTO v_resident FROM public.residents r WHERE r.id = p_resident_id AND r.organization_id = v_org;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'You don''t have access to this resident.');
  END IF;
  IF p_property_id IS NULL OR p_property_id NOT IN (SELECT public.get_user_property_ids()) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'You don''t have access to this property.');
  END IF;

  v_charge_id := CASE WHEN v_type = 'rent' THEN p_rent_charge_id ELSE NULL END;

  IF v_type = 'rent' AND v_charge_id IS NOT NULL THEN
    SELECT * INTO v_charge FROM public.rent_charges c WHERE c.id = v_charge_id AND c.organization_id = v_org;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('ok', false, 'error', 'That rent charge was not found.');
    END IF;
    IF v_charge.voided_at IS NOT NULL THEN
      RETURN jsonb_build_object('ok', false, 'error', 'This rent charge was cancelled and cannot accept payments.');
    END IF;
    IF v_charge.resident_id <> p_resident_id THEN
      RETURN jsonb_build_object('ok', false, 'error', 'That payment does not belong to this resident.');
    END IF;
    IF v_charge.property_id NOT IN (SELECT public.get_user_property_ids()) THEN
      RETURN jsonb_build_object('ok', false, 'error', 'You don''t have access to this property.');
    END IF;

    SELECT b.outstanding INTO v_outstanding
    FROM public.rent_charge_balances b
    WHERE b.id = v_charge.id;
    v_outstanding := COALESCE(v_outstanding, v_charge.amount_due);
    IF v_amount > v_outstanding THEN
      RETURN jsonb_build_object(
        'ok', false,
        'error', format(
          'This amount is more than the outstanding for this period. Enter ₹%s or record a separate payment.',
          trim(to_char(v_outstanding, 'FM999999990.00'))
        )
      );
    END IF;
    v_rent_month := v_charge.period_start;
  END IF;

  INSERT INTO public.payments (
    id, resident_id, property_id, organization_id, recorded_by, amount, payment_date,
    payment_type, payment_method, transaction_reference, rent_month, rent_charge_id, status, notes
  ) VALUES (
    p_payment_id,
    p_resident_id,
    p_property_id,
    v_org,
    auth.uid(),
    v_amount,
    COALESCE(p_payment_date, CURRENT_DATE),
    v_type,
    v_method,
    NULLIF(p_transaction_reference, ''),
    CASE WHEN v_rent_month IS NOT NULL THEN v_rent_month ELSE NULL END,
    v_charge_id,
    'paid'::public.payment_status,
    NULLIF(p_notes, '')
  );

  RETURN jsonb_build_object('ok', true, 'payment_id', p_payment_id, 'replay', false);
END;
$$;

CREATE OR REPLACE FUNCTION public.void_rent_charge(p_charge_id uuid, p_reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_charge public.rent_charges%ROWTYPE;
  v_paid numeric(10,2);
BEGIN
  IF auth.uid() IS NULL OR public.get_user_role() <> 'owner' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Only the owner can cancel an unpaid rent charge.');
  END IF;

  SELECT * INTO v_charge FROM public.rent_charges c WHERE c.id = p_charge_id AND c.organization_id = public.get_user_organization_id();
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'That rent charge was not found.');
  END IF;
  IF v_charge.voided_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', true, 'charge_id', v_charge.id, 'already_voided', true);
  END IF;
  IF v_charge.property_id NOT IN (SELECT public.get_user_property_ids()) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'You don''t have access to this property.');
  END IF;

  SELECT COALESCE(SUM(p.amount), 0) INTO v_paid
  FROM public.payments p
  WHERE p.rent_charge_id = v_charge.id
    AND p.payment_type = 'rent'
    AND p.status IN ('paid', 'partial');
  IF v_paid > 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'A charge with payments cannot be cancelled.');
  END IF;

  UPDATE public.rent_charges
  SET voided_at = now(), voided_by = auth.uid(), void_reason = NULLIF(p_reason, '')
  WHERE id = v_charge.id;

  RETURN jsonb_build_object('ok', true, 'charge_id', v_charge.id);
END;
$$;

CREATE OR REPLACE FUNCTION public.update_org_rent_due_day(p_due_day integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL OR public.get_user_role() <> 'owner' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Only the owner can change the rent due day.');
  END IF;
  IF p_due_day IS NULL OR p_due_day < 1 OR p_due_day > 28 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Rent due day must be between 1 and 28.');
  END IF;
  UPDATE public.organizations
  SET rent_due_day = p_due_day::smallint
  WHERE id = public.get_user_organization_id();
  RETURN jsonb_build_object('ok', true, 'rent_due_day', p_due_day);
END;
$$;

ALTER TABLE public.rent_charges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rent_charges_select" ON public.rent_charges;
CREATE POLICY "rent_charges_select" ON public.rent_charges
  FOR SELECT TO authenticated
  USING (property_id IN (SELECT public.get_user_property_ids()));

DROP POLICY IF EXISTS "rent_charges_insert" ON public.rent_charges;
CREATE POLICY "rent_charges_insert" ON public.rent_charges
  FOR INSERT TO authenticated
  WITH CHECK (property_id IN (SELECT public.get_user_property_ids()) AND public.can_user_write());

DROP POLICY IF EXISTS "rent_charges_update" ON public.rent_charges;
CREATE POLICY "rent_charges_update" ON public.rent_charges
  FOR UPDATE TO authenticated
  USING (property_id IN (SELECT public.get_user_property_ids()) AND public.get_user_role() = 'owner')
  WITH CHECK (property_id IN (SELECT public.get_user_property_ids()) AND public.get_user_role() = 'owner');

DROP POLICY IF EXISTS "payments_delete" ON public.payments;

REVOKE ALL ON FUNCTION public.generate_rent_charges(date) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.record_resident_payment(uuid, uuid, uuid, numeric, date, text, text, text, uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.void_rent_charge(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_org_rent_due_day(integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.rent_charge_due_date(date, smallint, date) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.protect_payment_immutability() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.generate_rent_charges(date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_resident_payment(uuid, uuid, uuid, numeric, date, text, text, text, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.void_rent_charge(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_org_rent_due_day(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rent_charge_due_date(date, smallint, date) TO authenticated;

GRANT SELECT ON public.rent_charge_balances TO authenticated;
