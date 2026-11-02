# Practical verification report

Verified locally on November 2, 2026, on Windows with Node.js 24.18.0 and npm 11.16.0. The original assessment PDF was not available; review follows the user's pasted practical specification.

## Implemented result

CarpasTask provides typed tRPC CRUD, server-generated UUIDs and UTC timestamps, Zod validation, exclusively in-memory storage, real dynamic SSR, hydrated query data, cursor-based infinite scrolling, creation/edit dialogs, destructive confirmation, accessible feedback, responsive layouts and a local SVG logo. The README includes the requirement mapping and local execution commands. No publication or remote repository was created.

The data flow is: user action → tRPC HTTP adapter → shared Node.js repository → typed response → query invalidation and refreshed UI. Initial navigation uses the same router through a direct server caller.

## Executed checks

| Check | Verified result |
| --- | --- |
| Dependency installation | `npm install` and reproducible `npm ci` succeeded; final lockfile is included |
| Required framework | Installed Next.js **15.5.28**; never upgraded to 16 |
| TypeScript | `npm run typecheck` passed with strict mode |
| ESLint | `npm run lint` passed without errors or warnings |
| Unit/integration/components | `npm run test`: **12 passed**, 2 files, with Vitest 5.1.0 |
| Production build | `npm run build` passed; `/` and `/api/trpc/[trpc]` are dynamic routes |
| Production start | The Next production CLI was started for initial browser checks; the final runner uses the Next Node API with `dev: false` and stops its own server |
| Browser suite | `npm run test:e2e`: **5 passed**, Chromium |
| Genuine SSR | HTTP creation followed by page HTML containing an actual task `<h3>`; independently visible with JavaScript disabled |
| Shared memory | Task created by HTTP tRPC is rendered by the independent SSR entry point in the same process |
| CRUD | Browser create/edit/delete, delete cancellation, empty state and success feedback passed |
| Validation/errors | Blank/whitespace/overlong fields, invalid UUIDs, missing updates/deletions and failed network request tested |
| Input preservation | Simulated create failure leaves draft intact; retry succeeds |
| Cursor consistency | 25 records, same-time ordering, deleted cursor boundary and newer insertion tested in router/repository suite |
| Infinite scrolling | 10 → 20 → 25 through fallback; 10 → 20 → 21 through actual scrolling; no duplicate rendered IDs |
| Responsive behavior | 390px mobile and 768px tablet: no horizontal overflow with long task content; mobile dialog checked |
| Keyboard | Escape dismissal and focus restoration verified in browser |
| Browser/server errors | CRUD flow captured no browser exceptions or error console messages; no application server failures in final runs. Network-failure test deliberately aborts one request |
| Source credential scan | No matching API keys, tokens, passwords or private-key markers found in project source |
| Production dependency audit | `npm audit --omit=dev --audit-level=low`: **0 vulnerabilities** |

The five production browser scenarios cover: full CRUD and keyboard dialog behavior; SSR without JavaScript; incremental pagination and post-mutation refresh; automatic scroll plus network failure/retry; mobile/tablet overflow and screenshots.

## Corrections made during verification

- Scoped a validation assertion to the form dialog so it does not also select Next.js's route announcer.
- Used a stable workspace browser cache in this sandbox, whose default profile cache changes between shell executions. Regular local users can use `npx playwright install chromium` normally.
- Added a small production test runner to own server shutdown on Windows, avoiding orphaned npm shell children.
- Upgraded Zod to 4.6.7 and applied a PostCSS 8.5.32 override while retaining Next.js 15.5.28. Production audit is clean.
- Upgraded Vitest to 5.1.0 and used its current Oxc JSX configuration, removing the test-tool critical advisories found in an earlier dependency tree.

## Remaining limitations

- **Memory is temporary and process-local.** Restarting the server loses tasks. Multiple processes or serverless instances do not share data. There is no browser storage or file persistence.
- Full `npm audit` still reports **14 moderate development-tool findings**, propagated from the minimatch dependency in the Next 15 ESLint toolchain. No high/critical findings remain. These packages are development tools, and the production-only audit is clean. A blanket minimatch major override would break older function-based consumers; forced downgrade suggestions would replace the lint stack with incompatible versions. This remains explicitly documented rather than applying an unverified override.
- Accessibility was checked through semantics, native dialog behavior, keyboard assertions and layout review; no manual screen-reader audit was performed.
- Browser automation ran on Chromium, not Firefox or WebKit.
- The list sorts the in-memory collection on each page request; this is appropriate for the small assessment dataset, not a large persistent task service.
- No PDF comparison was possible, no theoretical answer sheet was generated, and nothing was deployed or published to GitHub.

Actual captures: [desktop](desktop.png), [mobile](mobile.png). Suggested repository name: **carpastask**.
