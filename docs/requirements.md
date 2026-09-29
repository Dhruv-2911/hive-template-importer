# Requirements (distilled from the Hive Inspect assignment)

Hive Inspect, Forward Deployed Engineer take-home: **build a Spectora template importer**. Stated deadline:
21 Sept 2026 (extension on request). Expected effort: two focused days.

**The customer:** an inspection company leaving Spectora with a template tuned over four years. They will not
retype it. **Preserving their work matters more than originality.**

## Baseline (must work)

- [ ] **Import:** upload a Spectora HTML-text export. Preserve text, hierarchy and ordering. Show skipped or
      unsupported content in the UI; never drop or rewrite it quietly.
- [ ] **Edit:** rename sections and items, edit comment text, and save. How much further the editor goes is our call.
- [ ] **Copy:** duplicate a template. Editing the copy leaves the original unchanged.
- [ ] **Store:** a real backend (Supabase encouraged). Data survives closing and reopening the app. Browser storage alone doesn't count.
- [ ] **Model:** our own structured schema (templates → sections → items → comments, or similar). HTML inside a
      comment field is fine; the whole template as one HTML blob is not.

## Must explain / demonstrate

- [ ] How formatting, links and rich content are handled, and the limits.
- [ ] Which information is **missing from the export** and which is **present but unsupported by us** (see
      `docs/spectora-export-format.md`).
- [ ] That it works on other exports in the same format, not just ours.
- [ ] How we checked preservation, saved edits and independent copies.
- [ ] At least one failure case, handled honestly.
- [ ] If an LLM does any import mapping: what happens on malformed output, invented sections or dropped content.

## One improvement (after the baseline works)

Pick one: make the import **easier to trust**, make the editor **easier for a non-technical inspector**, or
**handle a difficult case** well. Explain the customer problem it solves.

## Platform

- Desktop web app (mobile is out of scope). Deployed on **Vercel** at a public URL. **We deploy on Render instead
  (ADR-001), so README and NOTES.md must say where it's hosted and why.**
- The live app opens on an already-imported template (seeded).
- If there's a login, include access instructions.

**Out of scope:** writing inspection reports, scheduling, payments, homeowner-facing reports or portals.

## Deliverables

1. **Repo:** meaningful commit history, the Spectora export, and a README (setup, database init, env vars). No
   credentials. Include reusable prompts, skills, agent setups and scripts.
2. **Live URL.**
3. **Video:** 8–10 min (12 max), YouTube unlisted, camera on for the intro. Parts: you · what you built (import on
   camera, save an edit, change a copy independently) · repo and AI usage · data model and preservation checks ·
   decisions · hardest problem plus one failure case · Hive feedback. Most time on parts 2–6.
4. **NOTES.md:** what we cut and why, supported input and known limitations, how we checked, time spent,
   credits (see References below).

Product exploration: Hive trial (required: run an inspection, publish a report, try template import). Binsr is optional;
compare its import with Hive's or explain why we skipped it.

If shortlisted: a live discussion plus a small change to our own code, so everything shipped must be explainable.

## References

- OpenInspection (AGPL-3.0): `server/lib/migration-intake/adapters/spectora.ts`. Used for export quirks and
  import-preview ideas only. **Don't copy its code** (licence). Its gaps are what we must do better on: it reads only 5 of 42
  columns, silently truncates names to 50/100 characters, and silently skips rows with a blank section or item.
