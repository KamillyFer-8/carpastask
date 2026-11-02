# Practical verification report

Verified locally on November 2, 2026, on Windows with Node.js 24.18.0 and npm 11.16.0. The original two-page assessment PDF was reviewed against the implementation, including its explicit creation/update page wording.

## Implemented result

CarpasTask provides typed tRPC CRUD, server-generated UUIDs and UTC timestamps, Zod validation, exclusively in-memory storage, real dynamic SSR, hydrated query data, cursor-based infinite scrolling, dedicated creation/edit pages, destructive confirmation, accessible feedback, responsive task cards and a local SVG logo. Optional civil date/time fields support a weekly calendar, and an on-page reminders panel displays overdue/upcoming tasks. The four original fields and required stack are preserved. The interface is Brazilian Portuguese with a printed-sheet layout: graph-paper background, dark rectangular borders, dotted rules, direct labels, orange accents, local Nunito font and a custom monochrome two-koi mark. The README includes the requirement mapping and local execution commands. No publication or remote repository was created.

The data flow is: user action → tRPC HTTP adapter → shared Node.js repository → typed response → query invalidation and refreshed UI. Initial navigation uses the same router through a direct server caller.

## Executed checks

| Check                       | Verified result                                                                                                                                                        |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dependency installation     | `npm install` and reproducible `npm ci` succeeded; final lockfile is included                                                                                          |
| Required framework          | Installed Next.js **15.5.28**; never upgraded to 16                                                                                                                    |
| TypeScript                  | `npm run typecheck` passed with strict mode                                                                                                                            |
| ESLint                      | `npm run lint` passed without errors or warnings                                                                                                                       |
| Unit/integration/components | `npm run test`: **21 passed**, 3 files, with Vitest 5.1.0                                                                                                              |
| Production build            | `npm run build` passed; listing and edit routes are dynamic; creation has its own page                                                                                 |
| Production start            | The Next production CLI was started for initial browser checks; the final runner uses the Next Node API with `dev: false` and stops its own server                     |
| Browser suite               | `npm run test:e2e`: **8 passed**, Chromium                                                                                                                             |
| Genuine SSR                 | HTTP creation followed by page HTML containing an actual task `<h3>`; independently visible with JavaScript disabled                                                   |
| Shared memory               | Task created by HTTP tRPC is rendered by the independent SSR entry point in the same process                                                                           |
| CRUD                        | Browser create/edit/delete, delete cancellation, empty state and success feedback passed                                                                               |
| Validation/errors           | Blank/whitespace/overlong fields, invalid UUIDs, missing updates/deletions and failed network request tested                                                           |
| Input preservation          | Simulated create failure leaves draft intact; retry succeeds                                                                                                           |
| Cursor consistency          | 25 records, same-time ordering, deleted cursor boundary and newer insertion tested in router/repository suite                                                          |
| Infinite scrolling          | 10 → 20 → 25 through fallback; 10 → 20 → 21 through actual scrolling; no duplicate rendered IDs                                                                        |
| Responsive behavior         | 390px mobile, 768px tablet and 1440px desktop: no horizontal overflow with long content on list and edit pages                                                         |
| Dedicated form routes       | Creation at `/tarefas/nova`, editing at `/tarefas/[id]/editar`; direct URL, refresh, cancel, save and missing/invalid IDs tested                                       |
| Localization and font       | `html lang="pt-BR"`, translated validation/errors and actual Nunito font loading verified                                                                              |
| Optional scheduling         | Real dates, valid 24-hour times, date-required-for-time rule, metadata preservation, moving dates and clearing schedules tested                                        |
| Complete weekly query       | `task.agenda` returns all 25 scheduled records in a week, independently of the ten-card first page                                                                     |
| Calendar interaction        | Add from a selected day, prefilled date, navigate weeks, jump to date, edit after refresh, clear date/time and delete scheduled records verified                       |
| Keyboard                    | Escape dismissal and focus restoration verified in browser                                                                                                             |
| Browser/server errors       | CRUD flow captured no browser exceptions or error console messages; no application server failures in final runs. Network-failure test deliberately aborts one request |
| Source credential scan      | No matching API keys, tokens, passwords or private-key markers found in project source                                                                                 |
| Production dependency audit | `npm audit --omit=dev --audit-level=low`: **0 vulnerabilities**                                                                                                        |

The eight production browser scenarios cover: full CRUD through dedicated pages and keyboard deletion confirmation; list, calendar, reminders and edit SSR without JavaScript; incremental pagination and post-mutation refresh; automatic scroll plus network failure/retry; missing/invalid edit addresses; mobile/tablet/desktop overflow, local font loading and screenshots; calendar scheduling, navigation, rescheduling, clearing and deletion; reminders independent of card pagination and refreshed after date removal.

## Corrections made during verification

- Scoped validation assertions to the form so they do not also select Next.js's route announcer.
- Implemented separate creation/update routes to follow the original PDF literally, with server-side task lookup and a localized not-found page.
- Translated the interface and validation to Brazilian Portuguese; the original PDF does not require English.
- Replaced the initial visual identity with orange/cream, self-hosted Nunito and a custom two-koi SVG inspired by the supplied reference. Kept all task actions functional and visible.
- Fixed decorative orbit overflow at tablet width and verified long text on list and edit pages across three viewport sizes.
- Added an optional scheduled date/time, a complete weekly agenda query and a responsive card grid. The agenda becomes day rows on mobile instead of overflowing the viewport.
- Explicitly replace optional fields during updates: JSON omits undefined keys, and clearing a schedule must still remove previous values. Verified through the real HTTP/browser flow.
- Removed the automatic root loading boundary so server-streamed task markup stays visible without JavaScript. Preserved query/form loading feedback; verified list, agenda and edit content with JavaScript disabled.
- Recreated the local Next.js build cache after this Windows sandbox denied access to stale generated directories; the final fresh production build succeeded.
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
- Scheduling stores a civil date and optional wall-clock time, not a timezone-converting appointment or a duration. Reminders are an on-page summary only; they do not send browser, push or email notifications. No external calendar integration, recurring events or drag-and-drop scheduling are implemented. There is no completion field; dates before today are classified as overdue, with that rule explained in the panel.
- The original practical PDF requirements were compared with the implementation. Theoretical answers and the public GitHub link are still separate submission work; no theoretical answer sheet was generated, and nothing was deployed or published.

Actual captures: [desktop](desktop.png), [mobile](mobile.png), [creation page](form.png), [mobile form](mobile-form.png), [empty state](empty.png). Suggested repository name: **carpastask**.

The editorial layout revision passed all checks above. The removed planning slogan is asserted absent in the browser suite. Reminder totals and preview limits were checked against more than one page of records; edits/deletions and cleared dates refresh the panel through query invalidation.
