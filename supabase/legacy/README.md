# Legacy Dashboard SQL

These files created the original demo schema. They were applied manually in the Supabase SQL Editor.

**Never** place them back in `supabase/migrations/`. The CLI would try to re-run `CREATE TYPE` / `CREATE TABLE` against production.

Trusted history starts with timestamped migrations after the production baseline.
