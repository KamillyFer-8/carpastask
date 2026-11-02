# CarpasTask

## Project Overview

CarpasTask is a task manager developed for the Artefact Software Engineer Brasil practical assessment. It supports task creation, listing, editing and deletion, with the initial list rendered on the server and task data held exclusively in server memory.

The required CRUD flow remains the core of the application. Infinite scroll and documentation cover the assessment bonuses. A weekly calendar and on-page reminders are optional additions that reuse the same task collection. The interface and documentation are in English; the specified Portuguese contract names are preserved.

## Demo and Screenshots

This production capture contains six fictitious tasks: two overdue, three upcoming and one without a date. Task cards appear above the calendar and reminders. A normal server start is empty.

![Six sample tasks with scheduled dates, a weekly calendar and overdue/upcoming reminders](docs/demo/overview.png)

<details>
<summary>Calendar and reminders</summary>

![Weekly calendar with timed and all-day tasks alongside the reminder panel](docs/demo/calendar-reminders.png)

</details>

<details>
<summary>Create, edit and delete</summary>

![Creation form with a title, description, date and time](docs/demo/create-task.png)

![Existing task loaded for editing](docs/demo/edit-task.png)

![Deletion confirmation with Cancel and Delete task actions](docs/demo/delete-task.png)

</details>

<details>
<summary>Mobile layout</summary>

![Task cards, calendar days and reminders stacked on a phone](docs/demo/mobile.png)

</details>

These are screenshots of the running application, not mockups. Reproduction instructions are included under Testing and Verification.

## Features

- Create and edit tasks on dedicated pages, with title validation, pending controls and preserved drafts after failed requests.
- Browse newest-first task cards and delete directly from the list after confirmation. Operations provide loading, success and error feedback.
- Load additional tasks automatically while scrolling, with a **Load more** fallback and an end-of-list message.
- Optionally schedule a date and time, navigate a Monday-first weekly calendar, or create a task from a chosen day.
- Review **Overdue** tasks and the **Next 7 days**. Each reminder group shows its total and up to three preview links, independently of card pagination.

Reminders are a visual summary inside the application. They do not send notifications or infer whether a task has been completed.

## Tech Stack

| Area | Tools and purpose |
| --- | --- |
| Application | Next.js 15.5.28, React 19 and strict TypeScript for routing, rendering and static checks |
| API and validation | tRPC 11 for inferred contracts; Zod 4 for runtime input validation |
| Server state | TanStack Query 5 for caching, mutations, invalidation and infinite queries |
| Interface | Tailwind CSS 3, custom CSS, Lucide icons and self-hosted Nunito |
| Verification | Vitest, React Testing Library, Playwright and ESLint |

Next.js, React and tRPC are specified by the case. The supporting tools implement validation, state synchronization, styling and automated verification. There is no database, ORM, authentication provider or additional global state library.

## Getting Started

Use **Node.js 22 or newer and npm**. From the repository root:

```sh
npm ci
npm run dev
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000). No environment file, API key or account is required. The server binds to loopback; stop it with `Ctrl+C`. `npm ci` uses the committed lockfile. `npm install` is also supported.

For production mode:

```sh
npm run build
npm run start
```

Run one local Node.js process. Task data is temporary and disappears when that process restarts, as required by the assessment.

## Assessment Requirements

| Required behavior | Implementation and evidence |
| --- | --- |
| Next.js v15 with tRPC | App Router and `/api/trpc/[trpc]`; installed version and typed API checked |
| Server-side in-memory collection | A shared `Map` in `src/server/repositories/tasks.ts`; HTTP mutations and SSR access the same repository |
| `id`, `titulo`, `descricao`, `dataCriacao` | Original field names retained; IDs and creation timestamps generated on the server |
| Create, list, update and delete | tRPC CRUD procedures covered by router and browser tests |
| Required title and meaningful errors | Shared Zod schemas reject blank titles; invalid input and missing records return `BAD_REQUEST` and `NOT_FOUND` |
| SSR-preloaded task list | `src/app/page.tsx` uses a server-side caller; production checks inspect the HTML and disable JavaScript |
| Listing with direct deletion and feedback | Card actions, confirmation, cancellation and mutation messages |
| Creation/update pages with functional components and hooks | `/tarefas/nova` and `/tarefas/[id]/editar`; validation, direct navigation, refresh and submission verified |
| Loading, success and failure states | Pending controls, accessible messages, retry and preserved input |
| Bonus: infinite scroll | Cursor pagination and IntersectionObserver; multi-page loading tested without duplicate IDs |
| Bonus: comments and documentation | Comments on non-obvious decisions, this README and the verification report |
| Public repository without sensitive information | Fictitious fixtures/captures, no required credentials and an appropriate `.gitignore` |

The case permits at least the four specified fields. Optional `dataAgendada` and `horario` fields support the calendar and reminders without changing the required model. These additions are not assessment requirements. The practical application is delivered through a public GitHub repository link; hosting is not required.

## Architecture and Technical Decisions

```text
src/app/                   Pages, server rendering and tRPC HTTP adapter
src/components/            Task workspace, forms, calendar, reminders and dialog
src/lib/                   Shared schemas, date utilities and query providers
src/server/api/router.ts   Typed procedures, validation and API errors
src/server/repositories/   Encapsulated in-memory collection
scripts/                   Production test runner and isolated demo capture
tests/                     Router, repository, component, date and browser tests
docs/                      Screenshots and detailed verification evidence
```

The repository owns collection operations; the router validates inputs and reports missing records. React manages form/dialog state, while TanStack Query manages server data. A separate service layer or state library would add indirection without additional business rules for this case.

The browser client imports the router's TypeScript type, so procedure inputs and results are inferred from the backend implementation. This catches contract mismatches during development. Types do not validate network payloads at runtime, so the server also applies Zod schemas. Reusing those schemas in the form provides consistent normalization and immediate field feedback.

Dedicated creation and edit routes match the assessment's page requirement and support direct URLs. Route segments remain Portuguese, while visible text is English. Backend modules use `server-only` guards, and repository methods return copies of stored tasks.

## Task Model and API

```ts
type Task = {
  id: string;             // Server-generated UUID
  titulo: string;         // Trimmed, 1 to 120 characters
  descricao?: string;     // Trimmed, up to 2,000 characters
  dataCriacao: string;    // ISO UTC creation timestamp
  dataAgendada?: string;  // Optional civil date, YYYY-MM-DD
  horario?: string;       // Optional 24-hour time, HH:mm
};
```

Only the title is required when creating a task. Blank descriptions, dates and times normalize to `undefined`. Validation rejects whitespace-only titles, invalid UUIDs, impossible dates and invalid times. A time requires a date. Clearing a date in the form also clears its time; a date without a time appears as **All day**.

Scheduled dates accept years 1900 through 9998. Native date/time controls can format their values according to the browser locale; the stored formats are those shown above.

Updates replace editable fields while preserving `id` and `dataCriacao`. Optional values are explicitly assigned so clearing a description or schedule works when JSON serialization omits undefined keys.

The HTTP adapter is `/api/trpc/[trpc]`. In the table, `EditableFields` means `{ titulo, descricao?, dataAgendada?, horario? }`.

| Procedure | Input | Result |
| --- | --- | --- |
| `task.create` | `EditableFields` | Created task |
| `task.list` | `{ limit?, cursor? }` | `{ items, nextCursor }` |
| `task.update` | `{ id, ...EditableFields }` | Updated task |
| `task.delete` | `{ id }` | `{ success: true }` |
| `task.get` | `{ id }` | Task for the edit page |
| `task.agenda` | `{ inicio, fim }` | All scheduled tasks in the requested range |
| `task.reminders` | `{ hoje }` | Overdue/upcoming totals and preview tasks |

The last three procedures support editing and the optional scheduled views. List limits are integers from 1 to 50, defaulting to 10. Calendar ranges must be valid and ordered, with a difference of at most 31 days. Missing tasks produce `NOT_FOUND`; unexpected internal errors use a generic message without response stack traces.

## Server-Side Rendering and In-Memory Storage

`src/app/page.tsx` uses the Node.js runtime and forces dynamic rendering. It calls tRPC directly on the server to fetch the first task page, current week and reminder summary in parallel, without an HTTP request to itself. These values render into the initial HTML and initialize the client queries through `initialData`.

Each provider creates its own QueryClient. A 30-second stale window avoids an immediate duplicate fetch after hydration. Subsequent browser operations use the tRPC HTTP client. There is no automatic root loading boundary, so the small memory reads finish before the page is returned and the task content remains visible without JavaScript.

The repository is anchored on `globalThis` so the route-handler and Server Component bundles share one `Map` within a Node.js process. This satisfies the storage requirement without a database or file persistence. A restart loses the collection, and separate processes, containers or serverless instances do not share it. Browser localStorage is not a source of truth.

The recorded production SSR test creates a task over HTTP, checks for its actual heading in the returned HTML and opens the list, scheduled views and edit page with JavaScript disabled. This verifies both rendering and shared storage, rather than treating the App Router alone as proof of SSR.

## Infinite Scroll and Data Synchronization

Tasks sort by descending creation timestamp, with descending ID as a stable tie-breaker. The cursor contains both values. Unlike an offset, this boundary does not shift when a newer record is inserted, and it still works if the cursor's task is deleted. The tests cover equal timestamps, a deleted boundary and insertion between page loads.

IntersectionObserver requests another page within 160px of the list end. Requests are blocked while a fetch is pending, rendered tasks are deduplicated by ID, and **Load more** provides a keyboard-accessible fallback.

Successful mutations invalidate the list, calendar and reminder queries. The list rebuilds its page boundaries, and scheduled views reflect moved or cleared dates. Calendar/reminder queries read the whole repository for their date criteria, so records are not omitted just because their cards have not loaded. Deletion waits for server confirmation instead of permanently hiding a task optimistically.

## Testing and Verification

```sh
npm run typecheck
npm run lint
npm run test
npx playwright install chromium
npm run build
npm run test:e2e
```

Leave port **3000** free before the browser suite. Its runner starts a separate production process, runs tests serially and stops that process afterward. Each browser scenario clears its own test repository; unit/integration tests use isolated repository instances. There is no public reset endpoint.

| Evidence | Result | Status for this documentation revision |
| --- | --- | --- |
| Strict TypeScript | Passed | Re-run |
| ESLint | Passed | Re-run |
| Vitest and React Testing Library | 21 tests passed across 3 files | Re-run |
| Production build | Passed on Next.js 15.5.28 | Previously recorded on November 2, 2026 |
| Production browser scenarios | 8 passed on Chromium | Previously recorded on November 2, 2026 |
| Demo capture and browser CRUD | Passed with six fictitious tasks | Previously recorded on November 2, 2026 |

Production build, browser and capture results were not re-executed for this documentation-only revision. Application code, dependencies and screenshots are unchanged. The earlier results and their scope remain recorded in [docs/verification.md](docs/verification.md).

Tests verify behavior: normalization, rejected input, missing records, metadata preservation, cursor traversal, date changes, query completeness and form recovery after failure. Browser scenarios exercise CRUD, keyboard cancellation, direct edit URLs, SSR without JavaScript, automatic/manual pagination and responsive overflow. The manual fallback test disables IntersectionObserver; a separate test exercises actual automatic scrolling.

To reproduce the screenshots:

```sh
npx playwright install chromium
npm run build
npm run demo:screenshots
```

This capture uses its own production process on port **3100**, creates fictitious tasks through tRPC, checks reminder counts and walks through browser CRUD. It writes to `docs/demo/`, uses dates relative to the capture day and does not reset another running preview. The temporary task collection disappears when the capture process exits.

## Design and Accessibility

The interface uses a printed-sheet layout, orange action accents, a local two-koi SVG and self-hosted Nunito. No runtime Google Fonts request or external logo is needed. On phones, panels stack and calendar columns become day rows. The header barcode ornament is decorative and hidden from assistive technology.

Semantic headings, labeled fields, visible focus indicators, a skip link and status/alert regions support navigation and feedback. The native deletion dialog makes background content inert, contains focus, supports Escape and restores focus when closed. Pending operations disable relevant controls. Long text wraps, and motion respects reduced-motion preferences.

## Limitations

- Storage is intentionally temporary and limited to one local Node.js process. It is unsuitable for a shared, multi-instance deployment.
- Scheduled dates are civil dates and do not undergo timezone conversion. The server computes today in `America/Fortaleza`; creation timestamps display in UTC. Native date/time input formatting can follow the browser or operating-system locale.
- Reminders classify dates before today as overdue. There is no completion status, background notification, recurring event or external calendar synchronization.
- There is no authentication, registration, team workflow or cross-tab live subscription. The app binds to loopback for local evaluation.
- Queries sort the memory collection, appropriate for this small case rather than a large persistent service. Browser verification covers Chromium; no manual screen-reader audit was performed.
- The prior dependency audit recorded zero production vulnerabilities and 14 moderate development-tool findings, with no high/critical findings. Audit dates, affected tooling and details are in the verification report; the audit was not refreshed for this revision.

Server-side validation, escaped React text, fictitious fixtures and ignored environment/build files support public-repository delivery. The detailed verification report documents the checks performed and their limits. Theoretical answers and their submission remain separate from this practical application.
