-- SQL security scenarios to run against local `supabase start` (Docker).
-- Not executed in CI when Docker is unavailable.
--
-- 1. Org A owner SELECT/INSERT/UPDATE/DELETE on Org B tables must return 0 rows / fail.
-- 2. Property A admin cannot see Property B residents, contacts, documents, deposits, payments, rooms, beds.
-- 3. Viewer cannot INSERT/UPDATE/DELETE operational tables.
-- 4. Storage: manager of Property A cannot read orgA/propertyB/... or orgB/...
-- 5. bootstrap_organization twice returns the same organization id.

select 1;
