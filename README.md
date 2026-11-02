# CarpasTask

**Simple tasks. Clear focus.** A small, accessible task manager built for the Artefact Software Engineer Brasil practical assessment.

Create, edit and delete tasks, read the first page directly from server-rendered HTML, and load more using cursor pagination. The interface is English throughout, with a locally implemented SVG carp mark, responsive cards, native modal dialogs and accessible feedback. There are no accounts, databases, external APIs or persistence services.

## Run locally

Prerequisites: Node.js 22 or newer and npm. Use one local Node.js process.

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:3000. For a production-mode run:

```sh
npm run build
npm run start
```

The server binds to loopback by default. Stop it with Ctrl+C. Dependencies are pinned in `package.json`; commit `package-lock.json` with the source. `npm install` also works, while `npm ci` reproduces the lockfile.

## Verification

```sh
npm run typecheck
npm run lint
npm run test
npx playwright install chromium
npm run build
npm run test:e2e
```

The end-to-end runner starts and stops its own **production** Next.js server through the Node API, using the existing build. This avoids orphaned npm shell children on Windows. Leave port 3000 free. Backend tests create isolated repositories; browser tests clean the running repository before each test and run serially. No production reset endpoint is exposed. See [verification results](docs/verification.md) for actual execution results and limits.

## Stack and structure

Next.js **15** App Router, React 19, strict TypeScript, tRPC 11, Zod 4, TanStack Query 5, Tailwind CSS 3 and Lucide React. Vitest, React Testing Library and Playwright cover the practical behavior.

```text
src/
  app/                 App Router page, layout, loading/error UI, tRPC HTTP handler
  components/          Task workspace, form, native dialog, SVG logo
  lib/                 Shared contracts/validation and tRPC React provider
  server/
    api/               Typed tRPC router and context
    repositories/      In-memory task repository
tests/                 Router/repository and component tests
  e2e/                 Production browser and SSR verification
docs/                  Verification report and actual screenshots
```

The repository owns collection operations. The router owns input validation and not-found errors. React owns interaction state; TanStack Query owns server-state caching. A separate service layer would add indirection without additional business logic.

## Contract

```ts
type Task = {
  id: string; // server-generated UUID
  titulo: string; // trimmed, 1–120 characters
  descricao?: string; // trimmed, at most 2,000 characters
  dataCriacao: string; // server-generated ISO UTC timestamp
};
```

Blank descriptions normalize to `undefined`. Updates replace the editable fields and preserve ID and creation time. Dates display consistently in English and UTC. Shared Zod schemas provide immediate form validation and authoritative server validation. tRPC infers client types from the router; type imports do not send server code to the browser. `server-only` guards backend modules.

The HTTP adapter is `/api/trpc/[trpc]`; frontend calls use tRPC exclusively.

| Procedure     | Input                                             | Result                  |
| ------------- | ------------------------------------------------- | ----------------------- |
| `task.create` | `{ titulo, descricao? }`                          | Created task            |
| `task.list`   | `{ limit?: 1..50, cursor?: { dataCriacao, id } }` | `{ items, nextCursor }` |
| `task.update` | `{ id, titulo, descricao? }`                      | Updated task            |
| `task.delete` | `{ id }`                                          | `{ success: true }`     |

Invalid inputs produce `BAD_REQUEST`. Missing records produce `NOT_FOUND` with “Task not found.” Unexpected failures have a generic user-facing message; response stack traces are removed. Forms preserve input on failure and disable controls while saving. Deletes wait for backend success. Successful mutations invalidate list queries and announce feedback; query failures offer a retry.

## SSR and shared memory

`src/app/page.tsx` is a dynamic Node.js Server Component. It invokes the tRPC server caller directly, without HTTP to itself, and passes the first page into `useInfiniteQuery` through `initialData`. Next renders the client component's initial markup on the server. A 30-second stale window avoids a redundant request immediately after hydration. Query clients are created per provider, never shared between visitors.

`src/server/repositories/tasks.ts` exports a controlled singleton repository, anchored on `globalThis` inside the Node.js process. This is intentional: Next may bundle route handlers and RSC into separate module graphs. Both obtain the same Map through the process global, including during development reloads. The production SSR test creates a task through HTTP tRPC, requests the page, checks an actual `<h3>` in the HTML, and opens it in a browser with JavaScript disabled. It therefore checks shared storage and rendered content together.

Data exists **only while that Node.js process is alive**. Restarting loses everything. Independent processes, clusters, containers and serverless instances do not share this memory. Hosting is not required or configured. A database would contradict the assessment. The app is intended for a single local user/process; it has no cross-browser live subscription.

## Infinite scrolling

The initial page contains ten tasks. The repository sorts by descending ISO creation date, then descending UUID. Cursors carry both values rather than a row index or offset. The next page selects tuples strictly after the boundary, even when the cursor's record has been deleted. Later insertions appear on refresh/invalidation; older pages remain ordered. Tests cover timestamp ties, deletion of a cursor record, insertion between page loads and traversal of more than two pages.

IntersectionObserver preloads within 160px of the list end. Fetches are blocked while a query is fetching. A keyboard-accessible **Load more** button is always available while more results exist, and the rendered task collection deduplicates by ID. Successful mutations invalidate the loaded pages; TanStack Query refetches from the start to rebuild cursor boundaries. The final page displays an end-of-list message.

## Design, accessibility and security

The interface uses quiet teal, warm neutral surfaces and simple cards. Semantic headings, labeled fields, visible focus rings, a skip link and status/alert regions support keyboard and screen-reader use. Native `<dialog>.showModal()` provides focus containment and inert background content; Escape cancels, and closing restores focus. Pending operations prevent dismissal. The form and destructive confirmation have separate clear actions. Long content wraps and mobile actions stay visible. Motion respects reduced-motion preferences.

React escapes user text; there is no unsafe HTML rendering. Server-side schemas enforce lengths and UUIDs. No secrets or environment variables are needed. `.gitignore` excludes environment files, builds, dependencies and generated test artifacts. The public repository must not include `node_modules` or `.next`. This assessment is a local application: authentication, authorization, rate limiting and durable/multi-instance storage are outside scope. Do not expose an unauthenticated task store as a shared production service.

## Acceptance checklist

| Requirement                                  | Implementation                                       | Verification                                           |
| -------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------ |
| Next.js 15 / strict TypeScript / lockfile    | `package.json`, `tsconfig.json`, `package-lock.json` | Installed version, typecheck, production build         |
| Typed tRPC + TanStack Query                  | `server/api/router.ts`, `lib/trpc.tsx`, HTTP route   | Router tests and browser CRUD                          |
| Exact Portuguese data fields                 | `lib/task.ts`                                        | Router tests                                           |
| Server UUID/date and normalized fields       | Repository and shared Zod schema                     | Create/update/validation tests                         |
| Server-only, shared in-memory storage        | Process singleton Map                                | HTTP creation + independent production SSR request     |
| Create/list/update/delete                    | Router and workspace                                 | Router tests and production browser flow               |
| Title, description and ID validation         | `lib/task.ts`                                        | Invalid/blank/overlong input tests                     |
| Meaningful missing-task errors               | Router                                               | Missing update/delete tests                            |
| Genuine dynamic SSR and hydration            | `app/page.tsx`, query initial data                   | HTML heading assertion and JavaScript-disabled browser |
| Form hooks, loading and duplicate protection | `task-form.tsx`, mutations                           | Component tests and browser flow                       |
| Success/error/empty feedback                 | Workspace, form, route error UI                      | Components and browser tests                           |
| Confirm/cancel deletion                      | Native dialog and workspace                          | Browser confirmation/cancel/CRUD test                  |
| Infinite scroll + accessible fallback        | Observer, query and tuple cursor                     | Router pagination, production 25-task browser test     |
| Stable ordering with concurrent changes      | Repository comparator/cursor                         | Tie, insert and deleted-boundary test                  |
| Responsive long content                      | `app/globals.css`                                    | 390px browser overflow checks/screenshots              |
| Branding/local SVG / English UI              | Logo, metadata, workspace                            | Source and actual screenshot review                    |
| Keyboard dialog and focus restoration        | `dialog.tsx`                                         | Escape/focus browser assertions                        |
| Production flow / clean browser errors       | Playwright config                                    | Production end-to-end suite                            |
| Documentation and limitations                | This README and verification report                  | Final review                                           |
| No secrets or publishing                     | `.gitignore`, source review                          | Credential scan; no remote configured                  |

The original assessment PDF was not present in the supplied directory. This checklist follows the user's pasted practical requirements; no theoretical answer sheet or submission PDF is generated.

Suggested public repository name: **carpastask**. No repository is published automatically.

## Actual interface

![Desktop interface](docs/desktop.png)

![Mobile interface](docs/mobile.png)
