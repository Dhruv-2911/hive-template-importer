# Spectora template importer

Imports a Spectora template export (*Export to spreadsheet → Export HTML Text*), checks it came across intact,
and lets an inspector rename, edit and duplicate it. Built for the Hive Inspect Forward Deployed Engineer take-home.

**Live app:** https://hive-template-importer-f6w9.onrender.com (hosted on Render, not Vercel; see
[ADR-001](docs/decisions/ADR-001-single-container-on-render.md) for why).

> This README is a stub while the app is being built. Setup, database initialization and the full command list
> arrive with the remaining tasks in `tasks/todo.md`. `SPEC.md` is the source of truth meanwhile.

## Deploy (Render + Supabase)

1. **Supabase:** create a project. In **Connect → Session pooler**, copy the URI and add `?sslmode=require`:
   `postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres?sslmode=require`.
   Don't use the **direct** connection (`db.<project-ref>.supabase.co`): it only has IPv6 addresses, and Render
   can't reach it, so `/api/health` returns 503 ([ADR-002](docs/decisions/ADR-002-supabase-postgres-session-pooler.md)).
2. **Render:** New → Blueprint → this repository (`render.yaml`). Enter `DATABASE_URL` when prompted. Pick the
   region closest to the Supabase project; the live app runs in Singapore against Supabase `ap-south-1` (Mumbai).
3. **Uptime monitor:** request `/api/health` every 5 minutes. It runs `SELECT 1`, so it keeps both the free Render
   instance and the free Supabase project awake.
4. Check: `curl https://<app>.onrender.com/api/health` returns `{"status":"ok"}`.
