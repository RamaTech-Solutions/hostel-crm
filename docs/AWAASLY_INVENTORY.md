# Awaasly inventory operations

## Occupancy formula

Canonical occupancy uses **active bed assignments**, not `beds.status`.

An assignment is active when `is_active = true` AND `end_date IS NULL`.

Every bed is in exactly one category:

| Category | Rule |
|----------|------|
| Occupied | Active assignment exists |
| Unavailable | No active assignment AND `beds.status` in `maintenance`, `reserved` |
| Vacant | No active assignment AND not Unavailable |

If an assignment exists while status says maintenance, reserved, occupied, or available, the **assignment wins**. Conflicting status is data drift, not a second category.

```text
Total Beds = Occupied + Vacant + Unavailable
Operational Capacity = Total − Unavailable
Occupancy % = Occupied / Operational Capacity × 100
If Operational Capacity = 0 → Occupancy = 0
```

Dashboard, properties list, property detail, `/rooms`, occupancy reports, and CSV export all use this formula. Inactive/archived properties are excluded from active operational totals and selectors.

## Room uniqueness

`UNIQUE(property_id, room_number)`.

**Create room** inserts a new row. On unique conflict, the existing room is loaded in the same property:

- Same floor → retry: reconcile beds to the requested count (no duplicate room).
- Different floor / different intentional create → `"A room with this number already exists. Edit the existing room instead."`

**Edit room** updates `rooms.id`. Renaming 101 → 102 keeps the same room id, beds, and history.

## Safe delete and archive

A room may be physically deleted only if:

- every child bed is itself safe to remove
- zero `bed_assignments` history
- zero `room_transfers` history (via those assignments)
- zero other operational FKs to `rooms.id`

Otherwise: `"This room has resident history and can't be deleted."` History is never cascade-deleted.

Floors may be removed only when they have no rooms.

Property archive sets `status = inactive`. It never hard-deletes. History stays. Owners can **Reactivate Property**. Archiving the last active property is blocked.

## Bed availability

Mark unavailable (`maintenance`) or restore vacant (`available`) only when there is no active assignment. Inventory UI does not set occupied/reserved on assigned beds. Resident lifecycle owns occupied transitions.

## Permissions

| Role | Properties | Floors | Rooms / beds |
|------|------------|--------|----------------|
| owner | create, edit metadata, archive, reactivate | add / rename / remove empty floors | full operational admin |
| property_admin | assigned properties only; no create/archive | read | operational room/bed on assigned properties |
| viewer | read assigned | read | read |

RLS matches this matrix (`20260815140000_inventory_permission_rls.sql`). Hiding buttons is not the security boundary.

## Floor numbering

New additional properties use `generateFloorRows` (Ground / `0..n`). Existing properties keep their stored floor numbers and ids. No historical renumbering.
