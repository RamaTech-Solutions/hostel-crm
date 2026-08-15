# Awaasly dashboard (Sprint 7)

Daily operations surface at `/dashboard`. Not a reporting warehouse, notification engine, or KYC product.

See also: [AWAASLY_INVENTORY.md](./AWAASLY_INVENTORY.md), [AWAASLY_RESIDENT_LIFECYCLE.md](./AWAASLY_RESIDENT_LIFECYCLE.md), [AWAASLY_RENT_LEDGER.md](./AWAASLY_RENT_LEDGER.md), [AWAASLY_DOCUMENT_SECURITY.md](./AWAASLY_DOCUMENT_SECURITY.md).

## Sections

1. Title and property scope
2. Core metrics: Properties, Occupancy, Active Residents, Outstanding Rent
3. Needs Attention
4. Property overview, Recent receipts, Recent move-ins
5. Setup guidance only when there are no current residents

## Core metrics

| Metric | Definition | Source |
| --- | --- | --- |
| Properties | Count of **active** properties in the current dashboard scope | `properties.status = active` |
| Occupancy | Occupied / (Total − Unavailable), rounded | Sprint 3 `summarizeOccupancy` |
| Active Residents | Currently staying: `active` + `notice_period` | Sprint 4 lifecycle |
| Outstanding Rent | See rent readiness below | Sprint 5 `rent_charge_balances` |

Archived/inactive properties are excluded.

## Rent readiness

Uses Sprint 5 `isEligibleForPeriod` (staying, `monthly_rent > 0`, active property, `joining_date <= period_end`).

| State | Meaning |
| --- | --- |
| No rent due yet | No eligible residents and no current-month charges |
| Rent not generated | Eligible > 0 and current-month charged residents = 0 |
| Rent generation incomplete | Eligible > charged (example: 51 vs 50) |
| Ledger complete ₹0 | Every eligible resident has a current-month charge and outstanding is 0 |
| Ledger complete with amount | Same, outstanding > 0 labeled **This month** |

Generate Rent (existing RPC) appears only when missing eligible charges **and** the dashboard is on **All** scope. The RPC generates for all properties the user can write (`get_user_property_ids()`). A single-property dashboard links to `/payments?property=…` instead of a misleading scoped generate.

Viewer: no generate CTA.

## Needs Attention (simple order)

1. Overdue rent — non-voided `ledger_status = overdue`, all periods, count + amount
2. Upcoming checkouts — staying, `planned_checkout_date` from today through today + 7 **calendar** days
3. No resident document uploaded — staying, zero non-`profile_photo` documents
4. Missing emergency/guardian contact — staying, no usable emergency **and** no usable guardian (`name` + `phone`)
5. Vacant beds — `classifyBed === vacant` (operational, not an error)

Zero items: “Everything looks up to date.” (not a compliance claim)

## Property selector

- Owner, >1 active property: All Active Properties + each
- Admin/viewer, >1 assigned active: All Assigned Properties + each (union of assignments, not org-wide)
- One authorized property: selector hidden
- `/dashboard?property=<unauthorized>` → `notFound()` (no all-scope fallback, no fake zeros)

Destination links preserve `property` / `propertyId` when scoped.

## Reports

- Occupancy: same occupancy helper
- Residents / CSV: currently staying (`active` + `notice_period`)
- Vacant beds / CSV: `classifyBed === vacant`
- Payments report: **receipts**, not charge outstanding

## Roles

Owner: all active properties. Property admin / viewer: assigned active only. Viewer is read-only.

## Database

No new tables or RPCs.
