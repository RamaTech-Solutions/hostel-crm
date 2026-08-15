# AWAASLY — PRODUCT & DEVELOPMENT CONTEXT

Last major context update: August 2026

This document is the persistent product context and source of truth for ongoing development of Awaasly.

Before implementing any significant feature, redesign, architecture change, migration, or new workflow, read this document first.

Do not contradict the decisions in this document unless the product owner explicitly changes them.

---

# 1. PRODUCT IDENTITY

## Product Name

Awaasly

Correct spelling:

Awaasly

Do not use:

- Awasly
- Awaasali
- PG CRM
- Hostel CRM
- PG Management CRM

in customer-facing product branding.

Legacy technical identifiers may retain old names where renaming would introduce unnecessary risk.

---

## Parent Company

Awaasly is a product of:

Ramatech Innovation Pvt Ltd

Customer-facing branding should primarily say:

Awaasly

Legal/footer/support context may say:

Awaasly by Ramatech

or:

Awaasly is a product of Ramatech Innovation Pvt Ltd.

Do not redesign Ramatech itself as part of Awaasly product tasks.

---

# 2. PRODUCT CATEGORY

Awaasly is a:

PG & Hostel Operations Platform

It is NOT positioned primarily as:

- a generic CRM
- an ERP
- a real-estate marketplace
- a booking marketplace
- a property-listing website
- accounting software
- a tenant-only application

The long-term product may support:

- PGs
- hostels
- student accommodation
- co-living
- managed rental accommodation

but the initial wedge is PG and hostel operators.

---

# 3. CORE BRAND PROMISE

Official tagline:

Every property. One place.

Primary marketing headline:

Run all your PGs from one place.

Core product promise:

Awaasly gives PG and hostel operators one place to manage properties, rooms, beds, residents, collections and daily operations without depending on paper registers, disconnected spreadsheets, WhatsApp records and repeated calls to individual property managers.

---

# 4. TARGET CUSTOMER

## Primary ICP

Independent or regional PG / hostel operators managing approximately:

- 2–10 properties
- roughly 50–500+ beds
- multiple managers/staff
- multiple resident records
- recurring rent collection

Primary initial geographies:

1. Noida / Greater Noida / NCR
2. Kota
3. Jaipur

Future expansion may include other Indian cities.

---

## Ideal customer pain

Typical target customer currently handles some combination of:

- paper registers
- Excel
- WhatsApp
- UPI screenshots
- manual rent records
- physical KYC/document files
- independent property managers
- phone calls to understand vacancy
- scattered resident information

Awaasly should reduce this operational fragmentation.

---

# 5. PRIMARY BUYER

Primary decision maker:

PG / Hostel owner or operator

Secondary users:

- property manager
- administrative staff
- viewer / read-only user

The UX should prioritize the owner/operator.

The owner should be able to understand:

- occupancy
- vacancies
- residents
- collections
- overdue rent
- property-level status

within a few seconds of opening the dashboard.

---

# 6. PRODUCT POSITIONING

Do not position Awaasly as:

"another cheap PG management app."

Initial differentiation:

Software + assisted digitization + multi-property control + simple onboarding.

For early customers Ramatech may assist with:

- account setup
- property setup
- room/bed configuration
- resident migration
- Excel/CSV migration when available
- training
- pilot support

The product should nevertheless support self-service signup and onboarding.

---

# 7. BUSINESS MODEL

Initial working commercial model:

## Founding Pilot

Early selected operators may receive approximately a 30-day free pilot.

The objective is:

real usage → feedback → paid conversion.

## Founding pricing direction

Current working range:

₹999/month for early/founding customers

Potential later plans:

- Starter
- Multi-property
- Growth
- Custom

Exact SaaS pricing is NOT permanently locked yet.

Do not hardcode complex pricing/billing assumptions into architecture.

---

## Assisted Digital Transformation

A higher one-time setup package may eventually be offered around:

₹24,999

Possible inclusions:

- property configuration
- room/bed setup
- resident migration
- workflow setup
- training
- initial support

This is separate from the basic SaaS subscription.

---

# 8. PRODUCT STRATEGY

Awaasly is being built as a real SaaS product, not merely a custom client dashboard.

Main business milestone:

First real PG/hostel operator using real operational data.

Important success sequence:

Visitor
→ Signup
→ Organization
→ Property
→ Rooms/Beds
→ Resident
→ Payment
→ Repeated usage
→ Paid customer

Do not optimize for feature count.

Optimize for activation and actual daily operational value.

---

# 9. CURRENT TECHNOLOGY STACK

Primary web application:

Next.js
TypeScript

Backend:

Supabase

Supabase responsibilities:

- PostgreSQL
- Auth
- Storage
- RLS
- server/database functions where needed

Authentication:

Supabase Auth
@supabase/ssr

Hosting:

Vercel

Current pilot architecture should remain:

Web
→ Vercel
→ Supabase

Do NOT introduce unnecessary:

- AWS EC2
- Azure VM
- Kubernetes
- OpenShift
- Redis cluster
- separate API servers

unless there is a justified scaling/security requirement later.

Ramatech has infrastructure expertise, but Awaasly should not be over-engineered before product-market validation.

---

# 10. FUTURE MOBILE ARCHITECTURE

A native/mobile application is planned later.

Preferred future direction:

React Native + Expo

It should use the SAME Supabase backend.

Conceptual architecture:

Awaasly Web
      │
      ├────────────┐
      │            │
      ▼            ▼
   Vercel       Expo App
      │            │
      └──────┬─────┘
             ▼
          Supabase

Do NOT create a separate backend for mobile.

Native mobile development is NOT part of the immediate MVP unless explicitly requested.

Mobile-responsive web remains important now.

---

# 11. CURRENT SaaS DATA MODEL

The existing Supabase architecture is being EVOLVED, not replaced.

Current main tables include:

- activity_logs
- bed_assignments
- beds
- floors
- notifications
- organizations
- payments
- profiles
- properties
- property_user_assignments
- resident_contacts
- resident_documents
- residents
- room_transfers
- rooms
- security_deposits
- user_roles

The hierarchy is conceptually:

auth.users
     │
     ▼
profiles
     │
     ▼
organization
     │
     ├── properties
     │      │
     │      ├── floors
     │      │      └── rooms
     │      │              └── beds
     │      │
     │      └── residents
     │
     ├── payments
     ├── deposits
     ├── documents
     └── operational history

---

# 12. MULTI-TENANCY

Awaasly is a multi-tenant SaaS.

Every real customer has their own organization.

Example:

Organization A
├── Property 1
├── Property 2
└── Property 3

Organization B
├── Property 1
└── Property 2

Organization A must NEVER be able to access Organization B's data.

Do not rely on frontend filtering for isolation.

Supabase RLS is authoritative.

Never weaken tenant isolation for convenience.

---

# 13. CURRENT MVP USER MODEL

For MVP a user is assumed to belong to one organization.

Current role system:

- owner
- property_admin
- viewer

There is also:

property_user_assignments

Do not introduce a complex multi-organization membership architecture unless a future requirement genuinely needs it.

A future `organization_members` model may eventually be introduced, but it is intentionally deferred.

---

# 14. ROLE BEHAVIOR

## Owner

Owner should be able to access/manage all properties in their organization.

Typical capabilities:

- organization dashboard
- properties
- floors
- rooms
- beds
- residents
- rent/payment data
- deposits
- documents
- property users
- organization-wide analytics

---

## Property Admin

Property Admin / Manager should only access assigned properties.

They must NOT automatically receive access to every property in the organization.

Typical allowed operations may include:

- resident management
- rooms/beds
- operational updates
- payment recording

within assigned properties.

---

## Viewer

Viewer should generally have read-only access to permitted/assigned information.

Do not grant sensitive writes.

---

# 15. SECURITY PRINCIPLES

Awaasly may eventually store:

- resident names
- mobile numbers
- addresses
- emergency contacts
- identity documents
- stay information
- payment information
- security deposits

Treat data protection seriously.

Requirements:

- RLS must remain enabled/secure
- storage must remain tenant-isolated
- service-role keys must never reach browser/client code
- secrets must never enter git
- cross-organization access must remain impossible
- property admins must remain property-scoped
- destructive database actions require caution

Never bypass RLS for normal customer operations merely to make code easier.

---

# 16. STORAGE MODEL

Resident documents should conceptually follow paths similar to:

organization_id/
property_id/
resident_id/
file

The bucket must remain private.

Owner:

access organization documents.

Property Admin:

access only assigned-property documents.

Viewer:

read according to approved permissions.

Do not create publicly readable resident KYC/document URLs.

---

# 17. CURRENT CUSTOMER FLOW

The required product journey is:

                 AWAASLY

                    │
                    ▼
              LANDING PAGE
                    │
       ┌────────────┼─────────────┐
       │            │             │
       ▼            ▼             ▼
   START FREE      LOGIN         DEMO
       │            │             │
       ▼            │             ▼
     SIGNUP         │       DEMO DASHBOARD
       │            │
       ▼            │
 AUTHENTICATION     │
       │            │
       ▼            │
  ORGANIZATION      │
       │            │
       ▼            │
   ONBOARDING       │
       │            │
       ▼            │
 FIRST PROPERTY     │
       │            │
       ▼            │
 FLOORS/ROOMS/BEDS  │
       │            │
       └──────┬─────┘
              ▼
          DASHBOARD
              │
      ┌───────┼────────┐
      ▼       ▼        ▼
 Residents  Rooms   Payments
      │
      ▼
Add First Resident
      │
      ▼
Daily PG Operations

This flow should not be broken by future feature development.

---

# 18. PUBLIC ROUTES

Current important public routes include:

/

Public Awaasly product website

/login

Existing-user authentication

/signup

New owner signup

/signup/check-email

Email confirmation guidance

/demo

Secure one-click demo login

/forgot-password

Password reset request (does not reveal whether the email exists)

/reset-password

Set a new password after a valid Supabase recovery session

Auth callback routes as required by Supabase

Do not turn `/` back into an immediate login redirect.

The root route is the marketing/product landing page.

---

# 19. PROTECTED ROUTES

Important authenticated areas include:

/dashboard

/properties

/residents

and the existing related operational routes.

Reuse existing route structure.

Do not duplicate a new version of a working module just for a redesign.

---

# 20. DEMO EXPERIENCE

Awaasly includes a secure one-click demo.

Demo account uses a fixed demo organization.

Current owner demo account exists in Supabase.

Do NOT expose demo passwords to:

- frontend
- URLs
- HTML
- localStorage
- public environment variables

`/demo` authenticates server-side using existing Supabase session behavior.

Demo and real organizations must remain isolated.

The demo dashboard may show:

You're exploring the Awaasly demo.

CTA:

Create Your Own Workspace

The demo should be useful for sales and product evaluation.

---

# 21. NEW OWNER SIGNUP

Expected new owner flow:

Full name
Business / PG name
Email
Mobile
Password
Confirm Password

→ Supabase Auth
→ Profile
→ Organization
→ Owner role
→ Onboarding

Do not ask for unnecessary data during signup.

Do not require:

- GST
- Aadhaar
- billing information
- payment card
- complex business details

during initial account creation.

---

# 22. OWNER ONBOARDING

Current intended onboarding:

1. Welcome
2. First Property
3. Floors
4. Rooms / Beds (Continue requires a room; Skip for now is explicit)
5. Finish → Dashboard or Add First Resident

The first property is created once and updated in place. Floors and rooms are reconciled from persisted state. Bed count reductions never delete beds that have `bed_assignments` history. Property type remains in `properties.notes` until a dedicated column exists (P2).

The experience must be:

- guided
- resumable
- mobile usable
- simple

If the owner logs out halfway through onboarding, logging in again should resume rather than create duplicate data.

Managers/viewers must not be forced through owner onboarding.

---

# 23. PROPERTY MODEL

Awaasly must always support multiple properties per organization.

Never introduce architectural assumptions that:

one account = one PG.

Target model:

Organization
├── Property A
├── Property B
├── Property C
└── ...

This multi-property capability is central to Awaasly's differentiation.

---

# 24. PROPERTY STRUCTURE

Preferred hierarchy:

Property
→ Floor
→ Room
→ Bed

Older demo data originally contained:

Property
→ Room
→ Bed

Floor support has been introduced/backfilled/evolved.

Future changes must preserve:

- room IDs
- bed IDs
- assignment history
- payment history

Do not casually recreate structural records.

---

# 25. RESIDENT MODEL

Resident functionality is a core MVP area.

Resident lifecycle conceptually includes:

Resident onboarding (Sprint 4): three screens — details, stay & financial setup, review. See [AWAASLY_RESIDENT_LIFECYCLE.md](./AWAASLY_RESIDENT_LIFECYCLE.md).

Then:

→ Possible room transfer
→ Checkout
→ Historical resident

Important related data includes:

- resident profile
- contacts
- documents
- bed assignments
- room transfers
- security deposit
- payments

Preserve history rather than overwriting it where practical.

---

# 26. ADD RESIDENT EXPERIENCE

The existing resident onboarding wizard should be reused and improved instead of rewritten unnecessarily.

Conceptual flow:

Personal Details
→ Contact
→ Address
→ Emergency Contact
→ Property
→ Room / Bed
→ Rent & Deposit
→ Documents
→ Photo
→ Review
→ Resident Created

Future UX work should simplify this without removing required operational data.

---

# 27. PAYMENTS

Current `payments` primarily represent received transactions/receipts.

Do not confuse:

payment

with:

monthly rent obligation.

A future model may introduce:

rent_charges

Example:

Rent Charge
₹8,500 due August 5

Payment
₹5,000 received August 3

Outstanding
₹3,500

The full rent-charge/ledger model is intentionally deferred unless explicitly requested.

Do not redesign the entire finance system incidentally during unrelated work.

---

# 28. SECURITY DEPOSITS

Security deposit tracking already exists.

Potential lifecycle:

Expected
→ Received
→ Held
→ Deduction if applicable
→ Refunded

Do not over-engineer accounting around deposits before real customer feedback.

---

# 29. DASHBOARD PRODUCT PRINCIPLE

The dashboard must answer:

What's happening across my properties?

within approximately five seconds.

Primary owner-level metrics should prioritize:

- number of properties
- occupancy
- residents
- pending rent

Relevant attention signals may include:

- overdue rent
- vacant beds
- upcoming checkouts
- missing documents

Do not fill the dashboard with vanity metrics.

---

# 30. FIRST-RUN DASHBOARD

A new customer may initially have:

1 property
0 residents
N beds
0 occupied

The dashboard should not look broken.

Use useful empty states and a simple setup checklist.

Example:

✓ Create account
✓ Add property
✓ Configure rooms
○ Add first resident
○ Record first payment

Do not turn this into unnecessary gamification.

---

# 31. BRAND IDENTITY — LOCKED

Official product:

Awaasly

Official tagline:

Every property. One place.

Brand personality:

- Warm
- Clear
- Dependable
- Organized

The product should feel:

calm + approachable + operational + trustworthy.

It should NOT feel:

- neon technology
- crypto
- generic blue enterprise SaaS
- childish
- luxury hospitality
- overly corporate

---

# 32. OFFICIAL COLOR SYSTEM

## Brand/Core Colors

Sunlit Amber
#F4B942

Charcoal Ink
#24221F

Warm Ivory
#FFF9EC

Soft Cream
#FFFDF7

Warm Stone
#E9E2D3

Warm Grey
#777168

## Semantic UI Colors

Calm Sage
#2F6B4F

Use for:

- success
- occupied
- paid
- active

Warm Orange
#D97736

Use for:

- warnings
- due soon
- partial payment
- notice

Muted Red
#C84C4C

Use for:

- overdue
- errors
- destructive actions

Dusty Blue
#355C7D

Use for:

- informational states

---

# 33. COLOR USAGE

Approximate visual balance:

60% warm ivory / white / cream
25% charcoal / neutral
10% amber
5% semantic colors

Amber is a brand signature.

Do NOT make the entire UI yellow.

Primary button:

background:
#F4B942

text:
#24221F

Do not use white text on the primary amber button.

---

# 34. LOGO

The canonical logo direction is:

An abstract modular capital A representing:

- multiple properties
- rooms
- accommodation
- one unified operating system

The canonical logo asset/reference must be reused consistently.

Do not invent new house icons.

Do not create slightly different A symbols across:

- navbar
- sidebar
- favicon
- landing page
- dashboard
- mobile navigation

Prefer one reusable `AwaaslyLogo` component.

Logo variants may include:

- primary
- reversed
- symbol
- monochrome
- stacked

---

# 35. TYPOGRAPHY

Current preferred product font:

Inter

General hierarchy:

Page Title
32/40 SemiBold

Section Title
20/28 SemiBold

Body
14/22 Regular

Label
12/16 Medium

Caption
12/16 Regular

Marketing headlines may be larger.

Prioritize readability over visual novelty.

---

# 36. UI DESIGN PRINCIPLES

Authenticated product screens should prioritize:

clarity > decoration.

Use:

- warm ivory backgrounds
- soft cream/white cards
- warm stone borders
- charcoal sidebar
- amber active states
- semantic status colors

Avoid:

- excessive gradients
- glassmorphism
- huge shadows
- excessive animation
- enormous rounded cards
- decorative clutter

Awaasly is an operational tool.

---

# 37. SIDEBAR

Desktop authenticated navigation should use:

Charcoal Ink background.

Active navigation:

Amber emphasis.

Inactive navigation:

soft ivory/neutral.

Only display features that actually exist.

Do not create nonfunctional menu items just because a design mockup shows them.

---

# 38. STATUS SEMANTICS

## Occupancy

Occupied
→ Calm Sage

Vacant
→ Amber / neutral amber

Notice
→ Warm Orange

Unavailable
→ neutral/warm grey

## Payment

Paid
→ Calm Sage

Due Soon
→ Amber / Warm Orange

Partial
→ Warm Orange

Overdue
→ Muted Red

Always accompany color with:

text and/or icon.

Never rely exclusively on color.

---

# 39. RESPONSIVE DESIGN

Awaasly web must remain usable on:

- desktop
- tablet
- mobile browser

Priority responsive routes:

- /
- /login
- /signup
- /onboarding
- /dashboard
- properties
- residents
- resident details
- payments

Desktop tables may become mobile cards/list rows where appropriate.

Avoid horizontal overflow.

---

# 40. CURRENT BRAND IMPLEMENTATION STATUS

A major Awaasly brand/UI refactor has already been implemented on:

`feat/awaasly-saas-foundation`

It includes approximately:

- design tokens
- Inter
- reusable logo/brand components
- favicon SVG
- charcoal sidebar
- redesigned landing page
- auth shell
- onboarding styling
- dashboard hierarchy
- property/resident/payment styling
- mobile cards
- robots
- sitemap
- not-found
- loading UI
- design-system components

Do not redo this entire refactor unless there is a clear regression or new direction.

Iterate on top of it.

---

# 41. CURRENT LANDING PAGE DIRECTION

Current hero:

PG & Hostel Operations Platform

Run all your PGs from one place.

Awaasly helps PG and hostel operators manage properties, rooms, residents and collections through one simple operating platform.

Primary CTA:

Start Free

Secondary CTA:

Explore Demo

The landing page should stay calm and product-focused.

Do not add fake customer proof.

---

# 42. EARLY-STAGE MARKETING RULE

Awaasly currently has no legitimate large-scale SaaS customer base.

Never invent:

- customer logos
- testimonials
- review scores
- thousands of users
- customer counts
- revenue claims
- "India's #1"
- market leadership claims

Use actual product functionality instead of fake social proof.

After real pilots, legitimate proof can be added.

---

# 43. CURRENT DEPLOYMENT

Current deployment approach:

Vercel
+
Supabase

Production/pilot domains may currently use Vercel URLs while development continues.

Planned pilot custom domain:

awaasly.ramatech.co.in

Main corporate domain:

ramatech.co.in

The existing Ramatech site must remain separate.

Later Awaasly may use its own dedicated domain.

The dedicated domain is NOT required for initial development.

---

# 44. DOMAIN ARCHITECTURE

Current intended relationship:

Ramatech Innovation Pvt Ltd
│
├── ramatech.co.in
│       Corporate/service website
│
└── Awaasly
        │
        └── awaasly.ramatech.co.in
                SaaS product

Awaasly may later move to:

awaasly.in

and potentially:

app.awaasly.in

Do not tightly couple application code to a temporary Vercel hostname.

---

# 45. PILOT PHILOSOPHY

Early customers may receive assisted onboarding.

Possible flow:

Owner signs up
→ sends existing Excel/register information
→ Ramatech configures property/residents
→ owner receives ready workspace
→ real usage
→ feedback
→ paid subscription

Self-service onboarding should continue to work, but the first customers do not need to be completely self-service.

---

# 46. PRIMARY MVP MODULES

The MVP should focus on:

1. Authentication
2. Organization
3. Properties
4. Floors
5. Rooms
6. Beds
7. Residents
8. Room/bed assignments
9. Payments
10. Security deposits
11. Resident documents
12. Basic dashboard
13. Roles/access
14. Demo
15. Owner onboarding

Everything else should justify its inclusion.

---

# 47. CURRENT DEFERRED FEATURES

Do NOT build these casually unless explicitly prioritized:

- SaaS billing/subscription engine
- Razorpay subscription integration
- Stripe
- tenant mobile app
- native owner app
- WhatsApp automation
- AI assistant
- biometric access
- visitor management
- food management
- IoT
- complex accounting
- marketplace
- public PG booking marketplace
- advanced payroll
- extensive maintenance management
- organization multi-membership redesign

Some of these may become important later.

They are not part of the current core MVP by default.

---

# 48. NEAR-TERM BACKLOG

Known future / P2 items may include:

- Google login (deferred until `awaasly.ramatech.co.in`)
- stronger demo write-protection
- team invitations
- CSV import
- Privacy Policy
- Terms
- dedicated property-type field
- report empty states
- notification/toast semantic styling
- improved social/OG assets
- mobile/native app

Do not automatically prioritize them over pilot-critical issues.

---

# 49. DEVELOPMENT PRINCIPLE

Before adding a feature ask:

Does this help the owner:

- know what is happening?
- reduce manual work?
- manage multiple properties?
- handle residents?
- handle occupancy?
- handle collections?
- operate more reliably?

If not, question whether it belongs in the MVP.

---

# 50. CURSOR IMPLEMENTATION RULES

For every future task:

1. Inspect existing implementation first.
2. Reuse working code/components.
3. Avoid unnecessary rewrites.
4. Preserve business logic unless change is requested.
5. Preserve RLS/security.
6. Preserve multi-property architecture.
7. Preserve demo flow.
8. Preserve signup/onboarding.
9. Use centralized design tokens.
10. Use reusable components.
11. Maintain TypeScript quality.
12. Maintain responsive behavior.
13. Run tests/lint/build.
14. Report any regressions.
15. Do not silently expand scope.

---

# 51. DO NOT MAKE THESE ASSUMPTIONS

Do not assume:

- one owner has only one property
- all users are owners
- manager sees all properties
- payments equal rent charges
- every customer wants every feature
- every property starts with the same floor naming
- web and mobile need separate backends
- every feature shown in a design concept already exists
- a UI-hidden action is sufficient security

Verify against the existing data model and application.

---

# 52. CHANGE PRIORITY

Classify discovered problems as:

## P0

Security/data loss/cross-tenant access/broken critical journey.

Must fix before real customer use.

## P1

Important pilot functionality or serious UX problem.

Fix before or during pilot.

## P2

Useful improvement that can wait.

Do not allow P2 polish to delay first customer validation.

---

# 53. CURRENT BUSINESS OBJECTIVE

The immediate business objective is NOT:

maximum features.

The immediate objective is:

Get the first real PG/hostel operator using Awaasly successfully and convert at least one operator into a paying customer.

Engineering decisions should support this objective.

---

# 54. CORE ACTIVATION EVENT

A new organization should be considered meaningfully activated when it has roughly:

- created its organization
- added at least one property
- configured rooms/beds
- added real residents
- recorded at least one real payment

Registration alone is not successful activation.

---

# 55. PRODUCT SUCCESS SIGNAL

The strongest early signal is:

An owner uses Awaasly without Ramatech reminding them to open it.

Followed by:

They depend on it for actual operations and choose to continue paying for it.

---

# 56. SOURCE-OF-TRUTH RULE

When a future prompt conflicts with this document:

1. Explicit latest instructions from the product owner win.
2. Then this document.
3. Then existing implementation.
4. Then old comments/docs/mockups.

Never treat an outdated screenshot or early prototype as higher priority than the latest approved product direction.

---

# 57. FINAL PRODUCT PRINCIPLE

Awaasly should always feel like:

Warmth on the outside.

Clarity and control on the inside.

Every property. One place.
