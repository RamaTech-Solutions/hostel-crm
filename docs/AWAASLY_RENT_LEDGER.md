# Awaasly rent ledger

Payments remain **receipts**. Rent **charges** are period obligations. Do not treat `residents.monthly_rent` as a due, and do not treat a payment as an invoice.

## Terms

| Term | Meaning |
|---|---|
| Charge | Resident owes ₹X for calendar month Y (amount snapshot) |
| Payment | ₹X received (immutable receipt) |
| Allocated | `payments.rent_charge_id` set (Option A, one payment → one charge) |
| Outstanding | amount_due − allocated_paid |
| Due | outstanding > 0 and due_date ≥ today |
| Partial | allocated_paid > 0 and outstanding > 0 |
| Paid | outstanding ≤ 0 |
| Overdue | outstanding > 0 and due_date < today |
| Unallocated (legacy) | historical receipt with `rent_charge_id` null |

## Canonical allocated_paid

`rent_charge_balances.allocated_paid` sums `payments.amount` where:

- `rent_charge_id` = that charge
- `payment_type = 'rent'`
- `status IN ('paid', 'partial')` (money received)

Not counted: `pending` / `overdue` receipt statuses, `deposit` / `refund` / `other`, unallocated legacy rows, security_deposits.

`payments.status` is a **receipt badge**, not charge status. `partial` on a payment means money was **received** and the operator labeled it as incomplete vs rent (legacy Record Payment form). It is not a failed or cancelled transaction. Sprint 5 new recordings insert `paid`. Counting `paid` and `partial` in `allocated_paid` is therefore correct. Do not treat `pending` as collected.

## Billing period

Calendar month. August 2026 = `period_start` 2026-08-01, `period_end` 2026-08-31.

**Collected** for August = allocated payments on August **charges**, even if `payment_date` is in September.

**Received** list = actual `payment_date`.

## Due date

`organizations.rent_due_day` (1–28, default 5). Owner sets it in Settings.

- Later months: due_date = that day in the month
- **First billing month** (month of `joining_date`): `MAX(normal due date, joining_date)` so rent is not overdue before move-in

## Generate

Owner and property admin: **Generate this month’s rent** (current month only). No historical auto-backfill from current `monthly_rent`.

Eligible: `active` or `notice_period`, `monthly_rent > 0`, `joining_date <= period_end`, current property active and authorized.

Not generated: `checked_out`, zero rent, join after the period. Blacklisted is not given extra finance rules (not eligible as not active/notice). Unpaid charges remain after checkout.

Idempotent: unique `(resident_id, period_start, charge_kind)` where not voided.

If the period already has legacy `rent_month` receipts with null `rent_charge_id`, the UI warns. Those rows are **not** allocated and **not** updated.

`ledgerGenerated` is false until at least one non-voided charge exists for the period. Dashboard Pending Rent shows **Rent not generated**, not ₹0 collected.

## Payments

`record_resident_payment` is one transaction. Client sends `payment_id` UUID once. Same UUID + matching payload returns the existing row. Conflicting payload fails.

Overpay on the selected charge is blocked. July + August outstanding requires two receipts.

Recorded payments cannot be deleted. Ledger-critical fields cannot be updated (`amount`, resident/property/charge, type, dates). Notes/reference only.

`rent_charge_id` cannot be reassigned after insert.

## Void

Owner only. Unpaid charges only. Charges with allocated rent payments cannot be voided. Voided charges cannot accept payments.

## Transfer

Charge `property_id` is a snapshot. Transfer does not rewrite it and does not create a second charge for the same period.

## Permissions

OWNER: org finance, generate, record, void unpaid, change due day.  
PROPERTY_ADMIN: assigned properties generate + record (not due day, not void).  
VIEWER: read.

RLS on `rent_charges` uses `get_user_property_ids()`. Payment DELETE policy removed. RPCs are SECURITY DEFINER, `search_path = ''`, `auth.uid()` only.

## Deposits

`security_deposits` is not rent. Deposit payments do not reduce charge outstanding.
