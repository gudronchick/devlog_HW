# DevLog

Task tracker for engineering teams with an embedded AI layer that handles subtask decomposition, Slack status updates, and daily workload prioritization.

## Quick start

```bash
# 1. Install dependencies
npm install   # or: yarn install

# 2. Copy env and fill in your Anthropic key
cp .env.example apps/backend/.env
# edit apps/backend/.env → set ANTHROPIC_API_KEY

# 3. Start both apps in parallel
npm run dev   # or: yarn dev
```

| Service  | URL                   |
| -------- | --------------------- |
| Frontend | http://localhost:3000 |
| Backend  | http://localhost:3001 |

The SQLite database is created automatically at `apps/backend/data/dev-log.db` on first run.

## Environment variables

See `.env.example` in the repo root for the full list. The only required secret is `ANTHROPIC_API_KEY`; every other variable has a sensible default.

```
NEXT_PUBLIC_API_URL=http://localhost:3001   # frontend → backend
PORT=3001                                   # backend listen port
FRONTEND_URL=http://localhost:3000          # CORS allow-list
ANTHROPIC_API_KEY=your_key_here
```

## Architecture

```
dev-log/                   ← Yarn workspaces monorepo
├── apps/
│   ├── frontend/          ← Next.js 15 (App Router)
│   └── backend/           ← Express + better-sqlite3
└── package.json           ← root scripts & shared devDeps
```

### Backend

RESTful API built with Express. All task data lives in a single SQLite file (`better-sqlite3`). The AI layer sits behind `/api/ai/*` routes and calls Anthropic's API with multi-step prompting. The database is initialised synchronously at startup-no migration tooling needed at this scale.

### Frontend

Next.js App Router. The main page (`/`) is an **async Server Component** that fetches tasks at request time and passes them as props to client components. Interactive features (board drag-and-drop, inline editing, AI buttons) are isolated in `'use client'` components. Server Actions (`lib/actions.ts`) handle mutations and call `revalidatePath` to keep the RSC cache fresh.

## Data storage

**Choice: SQLite via `better-sqlite3`**

SQLite was the right call for a single-user, local-first app:

- Zero infrastructure - the database is a file in `apps/backend/data/`.
- `better-sqlite3` is synchronous, which keeps the Express routes simple and avoids async-ORM overhead.
- WAL journal mode (`PRAGMA journal_mode = WAL`) gives concurrent reads without blocking writes.
- `ON DELETE CASCADE` on `parent_id` means deleting a task automatically removes its subtasks.

**Limitations:** not suitable for multi-user or multi-process deployments without switching to a networked database. For this scope that's an acceptable trade-off.

## AI agents

All three agents follow a **two-step reasoning pattern**: the first call produces free-form analysis, the second call uses that analysis as context and emits structured output. This is more reliable than asking for structured output cold-the model reasons in prose first, then distills.

The AI model used is `claude-haiku-4-5-20251001` (fast, low-cost, sufficient for structured extraction tasks).

### A - Daily prioritization (`POST /api/ai/analyse`)

Reads the full backlog from SQLite, runs a triage step to identify the critical path and risk patterns, then produces a `{ title, description, tasks[] }` JSON object. The frontend shows this as the **AnalysisPromptBanner**. It is ephemeral-not stored-and dismissed per-session.

### B - Task decomposition (`POST /api/ai/tasks/:id/subtasks`)

Given a task's title, description, and existing subtasks, the agent reasons about the work breakdown structure (deliverable, technical areas, dependencies) and returns up to 3 concrete subtask titles. The frontend shows them as editable suggestions before committing.

### C - Slack status update (`POST /api/ai/tasks/:id/update`)

Reads the task and all its subtasks, assesses the actual progress state (including stalls and blockers), then composes a 2–3 sentence Slack message. Tone: direct, factual, no filler. The user can copy the result straight into a standup thread.

## Monorepo

The repository uses **Yarn Workspaces** with two packages under `apps/`. This keeps frontend and backend in one repo without duplicating `tsconfig`, ESLint, or Prettier config. The root `package.json` runs both apps concurrently via `concurrently`. Shared devDependencies (TypeScript, ESLint, Prettier) are hoisted to the root.

The trade-off: a single `yarn.lock` means frontend and backend share a lockfile. For this project size that's fine; a larger codebase might want Turborepo or Nx for build caching.

## Pagination

Pagination was deliberately omitted. The target user is a single engineering team - dozens of tasks, not thousands. Rendering all tasks in one request keeps the UI simple (no cursor/page state, no skeleton loaders for subsequent pages) and the SQLite query is fast enough that it's not a bottleneck. If task volume grows, the right approach is cursor-based pagination on the `GET /api/tasks` endpoint; the `sortBy`/`order` params are already in place to support it.

## Form handling

No form library (React Hook Form, Formik, etc.). Both forms (`TaskCreateForm` and `TaskDetailClient`) use plain `useState` with controlled inputs. The validation surface is small - title required, length limits enforced on the backend, enum values constrained at the type level. Adding a schema library like Zod + React Hook Form would be the right move once forms get more complex or validation needs to be shared between frontend and backend.

## Request cancellation

Every AI call in the frontend passes an `AbortSignal` via `useRef<AbortController>`. The `useEffect` cleanup function calls `abort()` when the component unmounts. This means:

- Navigating away mid-generation doesn't leave dangling requests.
- The backend receives a cancelled request and Express drops it.
- On the client, `AbortError` is caught and silently ignored so no error toast fires.

This pattern is used in `AnalysisPromptBanner`, `SubtaskSection`, and `TaskDetailClient`.

## Accessibility

Key A11Y decisions across the UI:

- All icon-only buttons carry `aria-label` text (delete, dismiss, sort order toggle).
- Decorative icons have `aria-hidden="true"` so screen readers skip them.
- Loading states use `role="status"` and `aria-live="polite"` so assistive technology announces progress.
- Error messages use `role="alert"` for immediate announcement.
- Clickable `div` elements acting as buttons carry `role="button"` and `tabIndex={0}` with matching `onKeyDown` handlers (Enter to activate).
- Toolbar has `role="toolbar"` with `aria-label`.
- Select components are built on Radix UI primitives, which provide keyboard navigation and ARIA roles out of the box.
- The Radix Dialog used for the status-update modal handles focus trapping, `aria-modal`, and `aria-labelledby` automatically.

## Performance

- **Server Components for data fetching.** The task list is fetched in the async page component on the server, so the initial HTML contains real data-no client-side loading spinner on first paint.
- **Lazy loading.** `TaskBoard` and `TaskListView` are loaded with `React.lazy` + `Suspense`. This reduces the initial JS bundle since the board (dnd-kit) is the heavier component.
- **`React.memo` on `TaskCard`.** The card is rendered many times per board; memoisation avoids re-rendering unchanged cards when the task list is updated by a drag.
- **`useMemo` for derived state.** `tasksByStatus` grouping and column definitions are memoised so they don't recompute on every drag event.
- **Debounced search.** The search input debounces by 300 ms before pushing to the URL, reducing redundant server fetches while typing.
- **Font subsetting.** `next/font/google` loads Inter with `subsets: ['latin']`, which reduces font payload.

## Server-side rendering

The root page (`app/page.tsx`) is an `async` React Server Component. It calls `getTasks()` directly - using native `fetch` with `cache: 'no-store'` - before streaming the response to the browser. This means:

- Users receive a fully-populated task list in the initial HTML, not a loading skeleton.
- The task detail page (`app/tasks/[id]/page.tsx`) follows the same pattern, fetching a single task server-side.
- Server Actions (`lib/actions.ts`) call `revalidatePath` after mutations, which invalidates Next.js's RSC cache and triggers a fresh server render on the next navigation.

The tradeoff is that every hard navigation to `/` makes a synchronous backend call. For a local app this is fine; for a deployed product you'd add ISR or cache with a short TTL.

## Network layer - native fetch

The `lib/api.ts` module wraps native `fetch` in a thin `request<T>` helper (error normalisation + 204 handling). No Axios, SWR, or React Query.

**Why no data-fetching library:** SWR and React Query are excellent for client-side caching and background revalidation, but this app's primary data flow is server-rendered. Mutations go through Server Actions that call `revalidatePath`, which is the RSC-native invalidation mechanism. Adding a client cache on top would create two sources of truth. Native fetch + Server Components is the approach Next.js 15 is designed for.

**Why no Axios:** native `fetch` is available in Node 18+ and the browser without a dependency. The wrapper in `lib/api.ts` covers the only real gap (error body parsing).

## Daily plan card (AnalysisPromptBanner)

The banner appears on every page load by default. Dismissed state is **not persisted** (no localStorage, no cookie). This was a deliberate product decision:

- The analysis is based on live task data, which changes daily. A card analysed yesterday is stale by this morning.
- Persisting dismissal across sessions would mean users who dismissed it yesterday would miss today's plan entirely.
- The banner is lightweight (a single button press to trigger the AI call), so showing it each visit is low friction.

If the UX proves annoying in practice, the right fix is to persist the dismissal with a TTL of ~20 hours (i.e., dismiss once per calendar day). The component is structured to make that change local: replace the `dismissed` `useState` with a check against a `localStorage` timestamp.

## Web Vitals

Next.js 15 reports Core Web Vitals automatically in development (`next dev`) and production builds. The decisions most relevant to CWV:

- **LCP:** Server-rendered task list means content is in the initial HTML, not loaded after hydration. Lazy-loaded `TaskBoard` is deferred but not on the critical render path (it's inside `Suspense`).
- **CLS:** Radix UI components have stable dimensions; the `AnalysisPromptBanner` uses a fixed card layout that doesn't shift surrounding content.
- **INP:** `React.memo` on `TaskCard` and memoised grouping reduce unnecessary re-renders during drag-and-drop interactions.

No custom `reportWebVitals` integration was added - the built-in Next.js instrumentation is sufficient for local evaluation.

## Security

Several hardening measures are in place even for a local-only app, because habits matter:

- **SQL injection:** all queries use `better-sqlite3`'s parameterised `.prepare().run()` / `.get()` / `.all()` - no string concatenation.
- **Request body limit:** Express is configured with `express.json({ limit: '10kb' })` to prevent large-payload DoS.
- **Security headers:** every response carries `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, and `Referrer-Policy: strict-origin-when-cross-origin`. `X-Powered-By` is disabled.
- **CORS:** restricted to `FRONTEND_URL` (default `http://localhost:3000`), not a wildcard.
- **Input validation:** title and description have length caps enforced at the API boundary; status and priority are validated against an enum allowlist before touching the DB.
- **Prompt injection awareness:** AI prompts wrap user-supplied content in XML tags (`<task>`, `<title>`, etc.) and explicitly label it as user-supplied data, reducing the risk of prompt injection via task titles or descriptions.

## Running tests

```bash
# All tests
npm run test   # or: yarn test

# Backend only
yarn workspace backend run test

# Frontend only
yarn workspace frontend run test
```

Tests use Vitest. Backend tests use Supertest against the real Express app with an in-memory SQLite database. Frontend tests use Testing Library + jsdom.
