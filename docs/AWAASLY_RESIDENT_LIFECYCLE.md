# Awaasly resident lifecycle

## 3-screen create

1. **Resident Details** — required: full name, mobile. Optional: email, gender, DOB, address, guardian, emergency, work, ID.
2. **Stay & Financial Setup** — property → room → vacant bed, move-in date, monthly rent, optional deposit/remarks/planned checkout.
3. **Review & Add** — entered fields only. Success: View Resident or Add Another (property may stay; room/bed never do).

ID numbers are masked with `maskIdNumber` before persistence (`id_number_masked`, `id_last_four`). Raw ID is not sent to RPCs or logs.

## Financial split

| Resident setup | Payments module | Sprint 5 |
|----------------|-----------------|----------|
| monthly_rent, security_deposit_amount | received `payments` rows | `rent_charges` + `rent_charge_balances` — see [AWAASLY_RENT_LEDGER.md](./AWAASLY_RENT_LEDGER.md) |

## Idempotency

Client generates `resident_id` once per submit. `onboard_resident` returns the existing resident when the same authorized UUID already completed the matching stay.

## Transactions

SECURITY DEFINER RPCs (`search_path = ''`, `auth.uid()` only, EXECUTE to `authenticated`):

- `onboard_resident`
- `transfer_resident`
- `checkout_resident`

Current stay: `bed_assignments.is_active = true AND end_date IS NULL`. `current_bed_assignment_id` is a pointer only.

Unique: one active assignment per bed (existing) and per resident (`one_active_assignment_per_resident`). Linked audit on 2026-08-15 found zero conflicts.

Assignment end preserves `maintenance` / `reserved` bed status. Occupancy remains assignment-based.

Transfer date and checkout date cannot predate the current assignment start. Repeat checkout returns the completed state without extra payments.

## Permissions

Owner: org properties. Property admin: assigned only. Viewer: read. Inactive properties cannot receive move-in or transfer.
