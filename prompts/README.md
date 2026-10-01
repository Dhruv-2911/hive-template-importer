# How this was built with an AI coding agent

The assignment asks for the prompts, skills and agent setup used along the way. This is that setup. It's mostly plain
files in this repository that any agent, or person, can read.

## The context the agent works from

| File | What it does |
|---|---|
| [`CLAUDE.md`](../CLAUDE.md) | Loaded at the start of every session: the seven import rules (nothing lost silently, preserve text exactly, comments identified by source row…), the known values to verify against, and boundaries such as never modifying the committed exports and never copying AGPL code. |
| [`docs/requirements.md`](../docs/requirements.md) | The assignment as a checklist, so it doesn't need re-reading. |
| [`docs/spectora-export-format.md`](../docs/spectora-export-format.md) | Facts measured from both exports. The parser was written against this file, not against assumptions about spreadsheets. |
| [`scripts/profile_export.py`](../scripts/profile_export.py) | A reusable profiler for any Spectora export. Run it on a new file before trusting the parser with it. |
| [`SPEC.md`](../SPEC.md) | The approved spec: user stories, data model, API, commands, tests, boundaries, success criteria. |
| [`docs/decisions/`](../docs/decisions/README.md) | Eight ADRs, so decisions aren't silently re-made in later sessions. |
| [`tasks/plan.md`](../tasks/plan.md), [`tasks/todo.md`](../tasks/todo.md) | The task plan, with acceptance criteria, verification commands and review checkpoints. |

## The workflow

These are Claude Code skills (reusable instruction sets), applied in order:

1. **context-engineering:** read the assignment and profile the real export before deciding anything. Write the measured
   facts and the import rules into files the agent reloads every session.
2. **spec-driven-development:** a spec with explicit assumptions and open questions, approved before any code.
3. **documentation-and-adrs:** one record per significant decision (hosting, database, no LLM, storage, encoding,
   verification, editor scope, static export).
4. **planning-and-task-breakdown:** vertical slices with acceptance criteria, risky work first (deploying to Render and
   Supabase on day one), and checkpoints for human review.
5. **incremental-implementation** and **test-driven-development:** for every slice, a failing test, then the code, then
   lint, tests and a build, then a commit. That's one commit per verified step.
6. **frontend-ui-engineering:** a short design brief before UI code, then screenshots of the real container to review
   each screen.

## Working rules that mattered

- **Check expectations against the data before writing the test.** Twice a "known" value was wrong (a row number, an
  option order). Checking the raw file first meant the tests encode facts, not guesses.
- **Prove the safety nets with real failures, not mocks.** Database triggers that silently alter rows show that
  verification catches them and rolls back.
- **Look at the product.** Playwright screenshots of the container caught a page that scrolled away its own header and
  badges that added noise. They're cheaper than finding these in a review.
- **Gate commits on the test runner's exit code.** Once, piping pytest into `tail` hid a failing run and a commit went
  through. The rule is now in `CLAUDE.md`.
- **Measure in production.** The round-trip problem behind the slow import and duplicate only showed up against the real
  Supabase, and the fix is pinned by statement-count tests.
