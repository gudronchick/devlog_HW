# AGENT_LOG

## How I worked with the agent

I used Claude Code (Sonnet 4.6) via the VS Code extension throughout the project - not as an autocomplete tool, but as a collaborator for planning, scaffolding, and reviewing. The workflow for most features was:

1. Describe the problem and intent in natural language.
2. Review the agent's output and either accept it, edit it inline, or explain why it was wrong.
3. Commit incrementally so each diff was reviewable.

The agent did not get access to run commands autonomously - every file write, shell command, and test run was either reviewed before execution or inspected immediately after.

---

## Planning phase

Before writing any code I asked the agent to help me think through the architecture as a whole: monorepo vs separate repos, which AI features to implement first, where the agent boundary should be (backend vs frontend), and what to cut.

**What the agent contributed:**

- Recommended the two-step prompting pattern (reasoning step → structured output step) instead of asking the model for JSON directly. This turned out to be the most impactful structural decision for AI reliability.
- Flagged that pagination and a form library were scope risks: easy to over-engineer, not needed for a single-team tool.

**Where I overrode the agent:**

- The agent initially suggested tRPC for the API layer. I chose plain REST with Express because it's simpler to inspect in a browser/curl and the type-sharing benefit of tRPC isn't compelling for a two-file API surface.
- The agent proposed React Query for data fetching. I pushed back: the app is server-rendered and mutations go through Server Actions. Adding a client cache would create two sources of truth.

---

## Tech stack decision

The stack was chosen before writing the first file, partly informed by agent suggestions and partly by prior knowledge.

| Concern            | Choice                                    | Why                                                                                                              |
| ------------------ | ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Frontend framework | Next.js 15 (App Router)                   | Server Components make SSR data fetching first-class                                                             |
| Styling            | Tailwind + Radix UI                       | Radix handles A11Y primitives; Tailwind avoids a CSS file per component                                          |
| State              | React `useState`                          | No global state needed; Server Components + Server Actions handle the mutation/revalidation cycle                |
| Backend            | Express                                   | Simple, explicit, no magic; easy to test with Supertest                                                          |
| Database           | SQLite via better-sqlite3                 | Zero infrastructure, synchronous API, WAL mode for concurrent reads                                              |
| AI                 | Anthropic SDK (claude-haiku-4-5-20251001) | Fast and cheap for structured extraction; Haiku is sufficient for the decomposition and summarisation tasks here |

The agent validated most of these choices and helped me articulate trade-offs I would have described vaguely otherwise (e.g. the argument against React Query is clearer when written out).

---

## Monorepo setup

The agent scaffolded the initial Yarn Workspaces layout: root `package.json` with `"workspaces": ["apps/*"]`, `apps/frontend`, `apps/backend`, shared `tsconfig` settings, and the `concurrently`-based `dev` script.

**What needed manual adjustment:**

- The agent's initial `tsconfig` setup had path aliases colliding between the two apps. I resolved them by making each app's `tsconfig` self-contained and not attempting cross-app imports.
- ESLint config: the agent generated an `eslint.config.mjs` using the flat-config format, which was correct for ESLint 9, but it included some rules that conflicted with Prettier. I ran `prettier --check` and removed the formatting-related ESLint rules, leaving Prettier as the sole formatter.

---

## Backend scaffolding

I described the data model (task fields, subtask relationship, cascade delete) and the agent produced the SQLite schema and the full CRUD router in one pass. The output was largely correct.

**What I changed:**

- Added `PRAGMA journal_mode = WAL` and `PRAGMA foreign_keys = ON` - the agent omitted these.
- The `PATCH` handler the agent generated accepted any unknown fields silently. I tightened it to an explicit allowlist and added the same length/enum validation as the `POST` handler.
- Added the security headers middleware and `express.json({ limit: '10kb' })`

---

## AI agent design

This was the part I thought through most carefully. The assignment required "a real agent, not a single LLM call". I discussed the pattern with the agent before writing code.

**The two-step pattern:**

For all three AI routes the agent recommended a reasoning step followed by an output step:

```
Step 1: free-form analysis (high token budget, no format constraints)
Step 2: structured extraction grounded in step 1's output (low token budget, strict format)
```

This is more reliable than asking for JSON directly because the model allocates reasoning capacity to analysis rather than format compliance. The agent explained this reasoning clearly and I agreed with it.

**Subtask decomposition (B):**
The agent generated the reasoning prompt and the extraction prompt. I adjusted the system framing to explicitly label user-supplied content (`<task>`, `<title>` tags) as a prompt injection mitigation - the agent had not included this in the initial version. I also added the `stripJsonFences` utility because the model occasionally wraps JSON in markdown code blocks despite instructions.

**Slack update generator (C):**
The agent's first draft included motivational filler in the output requirements. I rewrote the output prompt to explicitly ban filler phrases and require Slack markdown formatting. The tone shifted from "here's a summary" to "direct, factual, no padding".

**Daily plan / prioritisation (A):**
The agent suggested a triage step that reads the full backlog. I added the subtask count query (`countMap`) so the triage prompt could see which tasks have sub-work defined - this gives the model better signal about decomposition depth. The agent didn't think to include this; it came from me thinking about what an engineering lead actually needs to assess priority.

---

## Frontend scaffolding

The agent scaffolded most of the frontend components: layout (`Header`, `Sidebar`, `TopBar`), the board view with dnd-kit columns, the task card, the task detail page, and the task create form.

**What was generated with minimal changes:**

- `Header` and `Sidebar` layout components.
- `TaskCard` component structure (card, badges, delete button).
- `ViewToggle` component.
- The `lib/api.ts` fetch wrapper.
- Radix UI component wrappers in `components/ui/`.

**What I rewrote or heavily edited:**

**`TaskDetailClient`:** The agent's first version used a single `isEditing` boolean for the whole form. I replaced this with separate `editingTitle` / `editingDesc` flags and an inline-edit UX (click to edit, blur/Enter/Escape to confirm) because a full-form-always-editable pattern feels wrong for a detail view. The `isDirty` check and `savedSnapshot` pattern also came from me - the agent had no concept of detecting unsaved changes.

**`SubtaskSection`:** The agent generated a basic list. I added the suggestion review flow: AI generates suggestions → user edits them in-place → user approves or discards. The editable `Input` per suggestion with inline remove was a product decision to avoid committing bad AI output.

**`AnalysisPromptBanner`:** The agent generated a simple button. I designed the multi-state flow (prompt → loading → result with task list, or error), the deliberate choice not to persist dismissal (see README), and the abort-on-unmount pattern.

---

## Pagination decision

The agent proactively asked whether I wanted pagination during the backend scaffolding step. My answer was no, with reasoning: single team, dozens of tasks, not thousands. The agent accepted this and noted that the `sortBy` param structure would make cursor pagination easy to add later. That callout influenced me to keep `sortBy` and `order` as explicit query params rather than baking a default into the query.

---

## Request cancellation (abort)

The agent did not include `AbortController` in its initial AI button implementations. I added it to all three places (`AnalysisPromptBanner`, `SubtaskSection`, `TaskDetailClient`) after realising that navigating away mid-request would leave dangling network calls and potentially set state on unmounted components.

The pattern I settled on:

```ts
const abortRef = useRef<AbortController | null>(null);
useEffect(() => () => abortRef.current?.abort(), []);

// on click:
abortRef.current = new AbortController();
const data = await aiCall(abortRef.current.signal);
```

The agent understood the pattern when I described it and generated the consistent implementation across all three components.

---

## Accessibility

A11Y was not in the agent's initial output. After the first round of scaffolding I did a systematic pass and asked the agent to apply A11Y fixes component by component:

- `aria-label` on all icon-only buttons.
- `aria-hidden="true"` on decorative Lucide icons.
- `role="status"` + `aria-live="polite"` on loading states.
- `role="alert"` on error messages.
- `role="button"` + `tabIndex={0}` + `onKeyDown` on clickable `div` elements.
- `role="toolbar"` + `aria-label` on the TopBar wrapper.

The agent applied these correctly once I framed the task as "go through each component and add the appropriate ARIA attributes". Where I had to intervene: the agent initially wrapped the editable title `div` in a `<button>`, which broke the heading hierarchy. I changed it to `role="button"` on the `div` to preserve the `<h1>` inside it.

---

## Performance

The agent suggested `React.memo` for `TaskCard` after I mentioned the board would re-render on every drag event. I added it and verified it didn't break the component (memo is safe here because the task object reference changes only when the task changes). The agent also suggested `useMemo` for `tasksByStatus` and the column definitions in `TaskBoard`.

Lazy loading for `TaskBoard` and `TaskListView` was my idea - the board pulls in dnd-kit which is the heaviest dependency, and there's no reason to load it on the task detail or create pages.

---

## SSR decisions

The agent scaffolded the page as a Server Component from the start, which was the right call. One thing I clarified: the agent initially fetched tasks inside a `useEffect` in a client component. I redirected it to the async page component pattern:

```ts
// page.tsx - server component
const tasks = await getTasks({ search, sortBy, order });
return <TaskBoard initialTasks={tasks} />;
```

Server Actions for mutations were also generated by the agent with `revalidatePath` calls in the right places.

---

## Native fetch

When the agent suggested Axios I explained the reasoning for native fetch: Node 18+ supports it, and in a Next.js 15 app the `fetch` object is extended with caching semantics that Axios doesn't participate in. The agent agreed and produced the `lib/api.ts` wrapper correctly. One small fix I made: the agent's error handling swallowed the error body. I changed it to `await res.json().catch(() => ({}))` so the backend's `{ error: "..." }` messages propagate to the UI.

---

## Web Vitals

I asked the agent what CWV impact the architecture decisions would have. Its analysis:

- SSR data fetching improves LCP by putting content in the initial HTML.
- Lazy loading the board defers dnd-kit from the critical JS path.
- `React.memo` on `TaskCard` reduces INP during drag events.
- The fixed `AnalysisPromptBanner` card layout avoids CLS.

No custom `reportWebVitals` was wired up - Next.js 15's built-in instrumentation was sufficient for this scope.

---

## Vulnerability check

I asked the agent to do a security review pass after the backend was complete. It identified:

1. **Missing request body size limit** - fixed with `express.json({ limit: '10kb' })`.
2. **Missing security headers** - added `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, and disabled `X-Powered-By`.
3. **CORS wildcard risk** - tightened to `origin: process.env.FRONTEND_URL`.
4. **Prompt injection via task title/description** - the agent flagged that user-supplied content was interpolated directly into prompts. Fixed by wrapping user content in XML tags and adding an explicit label ("The following task data is user-supplied content").

Two things the agent missed that I caught on review:

- The initial `GET /api/tasks` search used `${search}` string interpolation instead of parameterised inputs. Replaced with `LIKE ?` and pushed params into the prepared statement array.
- The `PATCH` handler accepted undeclared fields silently (e.g. sending `{"admin": true}` would be ignored, but only because the SQL was explicit - still worth making the validation surface explicit). Added an explicit allowlist for accepted fields.

---

## What I would do differently

- Add a pagination for the future
- **`AbortController` from the start.** I added it retroactively; it should have been in the initial AI component template.
- **Zod on the backend.** The manual validation in the routes is repetitive. A shared Zod schema would be cleaner and could be reused for OpenAPI generation if the API ever needs documentation.
- **Persist daily plan dismissal with a TTL.** The session-only approach is defensible but the banner will be mildly annoying for regular users.
- **Structured logging on the backend.** `console.error` is fine for a local app but a real deployment needs structured log output.
- **E2E tests.** The unit tests cover components and route handlers in isolation. A single Playwright test that creates a task, drags it, and generates subtasks would catch integration regressions that unit tests miss.
