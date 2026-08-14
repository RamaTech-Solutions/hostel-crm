# Awaasly database architecture

## Tenant model (MVP)

One authenticated user belongs to **one** organization (`profiles.organization_id`).

```text
auth.users
  └── profiles (id = auth.users.id)
        └── organizations
              ├── user_roles (owner | property_admin | viewer)
              ├── property_user_assignments
              └── properties[]
                    ├── floors[]
                    │     └── rooms[]
                    │           └── beds[]
                    ├── residents[]
                    ├── bed_assignments (history)
                    ├── payments (receipts, not invoices)
                    ├── security_deposits
                    ├── resident_documents
                    └── notifications / activity_logs
```

`organization_members` is **not** implemented. Add it only when a person must belong to two organizations.

## Organizations

Existing: `id`, `name`, `slug`, `logo_url`, `settings`, `is_active`, timestamps.  
MVP added: `is_demo`, `onboarding_completed_at`.  
Not added: plans, Stripe/Razorpay, trials.

Demo org slug: `urbanstay-pg` (`is_demo = true`).

## Access

| Role | Properties | Writes |
|------|------------|--------|
| owner | all in org | yes |
| property_admin | assigned only | yes, assigned only |
| viewer | assigned only | no |

## Floors

Schema: property → floor → room → bed.  
Demo data: rooms attached to `Ground / Unassigned` (`floor_number = 0`).  
`rooms.floor_id` remains nullable until every write path always sets a floor.

## Finance

`payments` = received transactions.  
Future: `rent_charges` (amount due, due date, remaining). Not in this migration.

## Signup bootstrap

`public.bootstrap_organization(name, full_name, phone)`:

- `auth.uid()` only
- creates org + profile + owner role in one transaction
- idempotent if the profile already exists
