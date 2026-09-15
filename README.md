# Career Transition OS

**Career & Growth Notes — a deployed-proof career blueprint.**

A personal operating system for moving an experienced IT Operations professional
toward production AI engineering roles: one place to know your next step, do the
work, record the proof, and move toward the right role — with an assistant that
can operate the portal for you.

No implementation existed before this build (the repository held only a
placeholder `README.md`), so everything below is new.

---

## What this is

Four screens, one assistant, one data model:

- **Today** (`/`) — the default home. Priority tasks, quick actions, a compact
  progress strip, and an end-of-day check-in.
- **Build & Learn** (`/build`) — Projects and Skills tabs. Evidence-gated status
  transitions (a project can't be "Deployed" without a deployment record, or
  "Validated" without test/evaluation evidence).
- **Opportunities** (`/opportunities`) — Jobs, Resume, Interviews, People tabs.
  Paste a JD and get a transparent Matched/Partial/Missing/Unknown breakdown
  against your real skills, projects, and evidence.
- **Progress** (`/progress`) — a deterministic, transparent readiness rubric per
  role, an application funnel, and weekly reviews. Shows "not enough evidence"
  rather than guessing, and never claims a probability of being hired.
- **Assistant** — a persistent side panel (desktop) / full-screen drawer
  (mobile) that can read and act on your data through the same domain
  functions the manual UI uses.

Guiding principle: **Learn → Build → Deploy → Demonstrate → Apply → Improve.**

## What was simplified / deferred

Per the brief's own scope-discipline section, these are intentionally **not**
built: live job scraping, sending applications or messages on your behalf,
background/push notifications, calendar integration, vector search, and
gamification. Resume export is plain-text copy + browser print-to-PDF rather
than a `.docx`/`.pdf` generator. AI-driven "tailoring" only creates named
resume versions from your own approved bullets — it does not auto-write new
bullet text, so nothing gets invented. See **Known limitations** below for the
full list.

---

## Architecture

```
src/
  lib/
    schema.ts            Single source of truth: zod schemas + inferred types
                          for every persisted record (profile, tasks, projects,
                          skills, evidence, jobs, resumes, interviews, contacts,
                          check-ins, weekly reviews, readiness snapshots, audit
                          log, chat history).
    storage/              Versioned localStorage adapter: validated read/write,
                          migration runner, corrupt-data quarantine (never
                          silently discards unreadable data), backup export /
                          preview / merge-or-replace import.
    domain/               Command layer. Every mutation — from a form or from
                          the assistant — goes through the same functions here:
                          create/update, status-transition business rules,
                          audit-log entries, opId-based idempotency, optimistic-
                          concurrency conflict detection, and undo.
    calc/                 Pure, deterministic calculation engines: readiness
                          rubric, JD-to-profile matcher, daily planner,
                          resume-text renderer, outreach-draft template,
                          project missing-proof heuristic.
    store/StoreContext.tsx  React context wiring the domain layer to
                          localStorage, with save-status, toasts, cross-tab
                          sync, and startup-corruption warnings.
    assistant/, ai/        Assistant open/close state, the typed+allowlisted
                          action registry, context builder (minimum-necessary
                          data sent to the model), system prompt, the
                          OpenAI-compatible provider adapter (server-only),
                          owner-passphrase gate, and the client-side executor
                          that is the only place model output can touch state.
  components/              UI, grouped by screen + a shared/ folder for
                          cross-screen pieces (evidence picker, add-job modal).
  app/                     Next.js App Router pages + the three /api/ai/*
                          route handlers (chat, test-connection, session).
```

**Why this shape:** the brief requires that "both forms and AI tools must use
the same domain service functions" and that the server can't read
localStorage. So mutations always happen client-side through `domain/commands.ts`
(via `useStore().run`); the server's only job is one thing — call the LLM with
a fixed, server-owned tool registry and return either a final message or a set
of proposed tool calls. The client executes those tool calls against the real
store, gets real results (success or a specific domain error), and reports
them back to the model for its next turn. The model never gets to claim
success on its own say-so.

---

## The AI action loop, concretely

1. Client builds a **minimum-necessary context** payload from the live store
   (`lib/ai/context.ts`) — profile summary, today's plan, counts, and a
   keyword-matched slice of possibly-relevant records. Compensation and a
   contact's private notes are included only when the message is actually
   about them.
2. `POST /api/ai/chat` with `{ context, messages }`. The server prepends its
   own system prompt (rules + the same context, restated) and calls the
   configured OpenAI-compatible endpoint with the fixed tool registry
   (`lib/ai/actions.ts`, ~30 actions). The base URL and API key never leave
   the server.
3. If the model responds with `tool_calls`, the client's executor
   (`lib/ai/executor.ts`) runs each one — a closed `switch` over allowlisted
   action names, nothing dynamic — against the real domain commands. Each
   call gets an opId derived from the model's own `tool_call.id`, so a retried
   call is deduplicated by the same audit-log check the forms use.
4. Tool results (including domain validation errors, e.g. "needs evidence
   first") are sent back to the model so it can respond honestly, and the
   loop continues (capped at 6 rounds) until the model returns plain text.
5. The panel shows the executed actions with an inline **Undo** per action
   (calls `undoAudit` directly, no round-trip through the model needed), and
   only a completed turn gets written into the visible chat history.

If no provider is configured, `/api/ai/chat` returns a `not_configured`
response and the panel says so plainly — manual CRUD, the daily planner, JD
matching, and readiness scoring all work with zero AI configuration.

### Capability map

**Read-only:** search tasks/projects/skills/jobs/interviews/contacts, get
today's plan, get readiness (+ prior snapshot for comparison), get a factual
7-day weekly summary, list recent actions (for undo).

**Mutations** (all through the same commands the UI uses): create/update
tasks, set status, log time, move due dates; create/update projects, set
status (evidence-gated); create/update skills; create evidence and link it to
a project or skill; save a job (auto-runs the JD match if text is given),
re-run a match, set status, schedule a follow-up; schedule an interview, add
prep tasks and practice questions; add a contact, schedule a follow-up; save
a check-in or weekly review; create a resume version from approved bullets;
undo one action by id.

**Navigation:** open the relevant screen for a record.

**Intentional limits:** no delete/archive action is exposed to the assistant
— those stay manual and reversible by hand. No action sends anything
externally (no emails, no applications, no LinkedIn messages) — outreach and
resume text are drafted for you to copy. No fabrication tools exist: there is
no "add a fake contact" or "invent a metric" action, because the domain layer
has nothing that would accept it.

---

## Setup

```bash
npm install
cp .env.example .env.local   # then fill in real values, see below
npm run dev                  # http://localhost:3000
```

The app works fully with **no `.env.local` at all** — every screen, the
planner, JD matching, and readiness scoring are pure client-side logic. Only
the assistant's chat needs a provider.

### `.env.local` (see `.env.example` for the full template)

| Variable | Purpose |
|---|---|
| `AI_PROVIDER_BASE_URL` | Any OpenAI-compatible `/chat/completions` endpoint |
| `AI_PROVIDER_API_KEY` | Server-side only. Never reaches the browser, localStorage, or chat. |
| `AI_PROVIDER_MODEL` | Must support tool/function calling for the action loop to work |
| `AI_ENDPOINT_ACCESS_TOKEN` | Optional owner passphrase gate for `/api/ai/*` (see below) |
| `AI_MAX_TOOL_ITERATIONS`, `AI_REQUEST_TIMEOUT_MS` | Loop/timeout bounds |

**Owner gate:** if you deploy this somewhere reachable by more than just you,
set `AI_ENDPOINT_ACCESS_TOKEN` to a long random string. Settings → AI
assistant connection will then ask for that passphrase once per browser
before the assistant or the connection test can be used (an httpOnly cookie,
checked server-side with a constant-time comparison — the token itself never
touches client JS). Leave it unset for local-only use and the gate is
skipped entirely. An obscure URL alone was explicitly not considered
sufficient, so this exists as a real, if lightweight, check.

Verify the connection any time in **Settings → AI assistant connection →
Test connection**.

---

## Persistence, migration, and backup

- All data lives in **browser localStorage only**, under one versioned key
  (`career-transition-os:state:v1`), validated against the zod schema on every
  read and write. It does **not** sync across devices or browsers, and
  clearing site data deletes it — export a backup periodically.
- **Migrations:** `lib/storage/migrations.ts` holds a version→version+1
  function map, run automatically on load. There's one schema version today;
  when a field's meaning changes, add a step there rather than reinterpreting
  old data in place.
- **Corruption handling:** unreadable or schema-invalid data is never
  silently discarded — it's copied to a timestamped
  `career-transition-os:corrupt-backup:<ts>` key and the app starts fresh
  with a visible warning banner, so nothing is lost without a trace.
- **Backup:** Settings → Storage & backup → *Export backup* downloads a JSON
  file (schema version + all records, no secrets — none are ever stored
  client-side). *Import backup* previews incoming vs. duplicate counts per
  record type before you choose **Merge** (keeps the newer `updatedAt` on a
  conflict) or **Replace** (destructive, requires an explicit confirm dialog).
- **Multi-tab:** a `storage` event listener picks up another tab's write and
  swaps in the newer state with a toast, rather than two tabs silently
  fighting over the same key.

---

## Test results

```
npm test         # vitest — 57 tests, 9 files, all passing
npm run lint     # eslint (next/core-web-vitals) — clean
npm run typecheck
npm run build    # next build — compiles, typechecks, prerenders all routes
```

Coverage focuses on behavior, not implementation mirroring:

- **`domain/commands.test.ts`** — task creation/status rules (evidence gate),
  opId idempotency on retry, optimistic-concurrency `ConflictError` on a stale
  edit, `NotFoundError` on a bad id, undo of a create and of an update, undo
  refusing to clobber a later independent edit, refusing a double-undo,
  project Deployed/Validated evidence gating, bidirectional evidence linking.
- **`calc/readiness.test.ts`** — a brand-new profile reports "not enough
  evidence" for every dimension and the overall score (never a fabricated
  number), a skill linked to the *wrong* role doesn't inflate the dimension
  it isn't linked to, and the weighted score only appears once every
  dimension has real evidence.
- **`calc/jdMatch.test.ts`** — a too-short JD is flagged `insufficient`
  instead of scored confidently, strong evidence maps to "matched" (not just
  "partial"), an unrelated requirement is honestly "missing" rather than
  invented as a match, and IT-ops language ("incident management",
  "stakeholders") is treated as transferable/partial.
- **`calc/planner.test.ts`** — overdue and blocked tasks outrank low-priority
  ones, and the plan never exceeds three priority slots.
- **`domain/auditRetention.test.ts`** — a short audit log is left untouched,
  recent entries stay fully undoable, older ones keep their summary but lose
  their heavy snapshots, the log is hard-capped, pruning is idempotent, and
  undoing a trimmed entry is refused rather than restoring a null snapshot.
- **`ai/rateLimit.test.ts`** — requests are allowed up to the limit and
  blocked after, budgets are separate per caller and per rule (chat traffic
  can't lock you out of unlocking), the window frees up again on expiry, and
  the proxy header is parsed to the first hop.
- **`dateTime.test.ts`** — relative-date resolution ("tomorrow", "in 3 days",
  "next monday") against the Asia/Kolkata calendar, and an unresolvable
  phrase returns `null` instead of a guess.
- **`storage/localStorageAdapter.test.ts`** — first-run defaults, a full
  save→load round trip, corrupted JSON preserved as a backup rather than
  discarded, a schema-invalid payload rejected without crashing, import
  preview/merge behavior.
- **`ai/executor.test.ts`** — the assistant's action switch, exercised
  end-to-end with a fake store: task creation goes through the real domain
  layer, a retried `tool_call.id` doesn't double-create, a domain
  `ValidationError` (missing evidence) comes back as a failed result instead
  of throwing across the boundary, an unknown action name is refused, a real
  (not canned) JD-match runs when a job is created with JD text, a mutation's
  `auditId` round-trips through `undo_action`, and `search_tasks` resolves a
  name to an id without mutating anything.

**Manually verified with a live headless-browser smoke test** (Playwright
against `next dev`): onboarding → add task → reload (persists) → mark done
→ Build & Learn (add project, evidence-gated status) → Opportunities (paste
a JD, see a real Matched/Partial/Missing breakdown with a "build evidence
first" recommendation) → Progress (correctly shows "not enough evidence" for
a new profile) → Settings → Assistant (shows "AI not connected" gracefully
with no key configured) — desktop and mobile viewports, zero console errors.

Two real bugs were caught this way and fixed before delivery: a duplicate
React key across two drawer components sharing a fallback string, and a
duplicated "AI not connected" sentence in the assistant's fallback message.
A third finding — that same-millisecond writes could produce identical
`updatedAt` timestamps and defeat conflict detection — was caught by the
vitest suite and fixed by making the shared timestamp helper monotonic.

### Hardening pass (post-delivery review)

A follow-up review found and fixed the following:

- **Stale drawer state (data-loss class bug).** Task/Project/Skill drawers
  seeded their form state from props but were never remounted, so opening
  record B after record A showed A's values — and saving would have written
  A's field values onto B. Reproduced in a real browser (opening "ALPHA"
  displayed "BETA"), fixed by mounting drawers only while open, and
  re-verified. This also fixes "Add task" reopening pre-filled with the
  previously created task.
- **Conditional `React.useId()`** in `Input`/`Textarea`/`Select` — a
  rules-of-hooks violation (the hook was skipped whenever an explicit `id`
  was passed), now always called.
- **Unbounded audit log.** Every mutation stored full before/after copies of
  the record; a job edit carries the whole JD and match result twice, so the
  log would eventually exhaust the localStorage quota and block saves. Now
  pruned: the last 50 entries stay fully undoable, older ones keep their
  summary line but drop their snapshots, and the log is hard-capped at 500.
  Undo refuses a trimmed entry with a clear explanation rather than
  restoring an empty snapshot.
- **Missing rate limits** (a spec requirement that had not been
  implemented): `/api/ai/chat` is capped at 30 requests/minute per caller,
  and passphrase attempts at 5 per 5 minutes, so the owner gate can't be
  brute-forced in a loop.
- **Keyboard accessibility.** Tab could previously escape an open drawer
  into the page behind it. Drawers now trap focus, restore focus to the
  triggering element on close, and confirm dialogs close on Escape and land
  focus on Cancel (not the destructive button).
- **ESLint was never actually configured** — `npm run lint` dropped into an
  interactive setup prompt and checked nothing. Now wired to
  `next/core-web-vitals` and passing clean.

**What couldn't be run here:** a live call to a real LLM provider (no API key
in this environment) — the `not_configured` path, the tool-calling loop
against a mocked/scripted response, and the manual/AI parity are what's
covered instead. Test live tool-calling against your own provider once
configured; `AIConnectionPanel` (`Settings → Test connection`) is the fastest
way to confirm the wiring end-to-end.

---

## Known, current limitations

- Resume "tailoring" creates a named version snapshot from your own approved
  bullets; it does not generate new bullet text. Rewriting bullets is a
  manual, per-bullet edit (with automatic history) in the Resume tab.
- No `.docx`/`.pdf` export yet — copy-to-clipboard and browser print-to-PDF
  cover the "copyable, printable" requirement without a new file-generation
  dependency.
- The assistant's date resolution asks the model to compute relative dates
  from the supplied "today," with `resolveRelativeDate` as a client-side
  fallback normalizer — it is not a from-scratch NLP date parser.
- Single-user, single-browser by design (see Persistence above); there is no
  authenticated multi-device sync in this release, matching the brief's
  explicit "not required for the first release."
- `npm audit` reports advisories in dev-only tooling (vitest/vite's transitive
  deps, used only for `npm test`, never shipped) and some Next.js 14.x CVEs
  that are largely about edge/middleware/self-hosted image-optimization
  paths this app doesn't exercise; the app pins the latest available 14.2.x
  patch. A future upgrade to Next 15 is a reasonable follow-up, not treated
  as blocking here.
