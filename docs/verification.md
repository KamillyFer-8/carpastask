# Verification report

Verified on November 2, 2026, on Windows with Node.js 24.18.0 and npm 11.16.0. The practical requirements were compared with the original two-page assessment PDF. The written-case email additionally requires English responses; the final interface, messages, documentation and demo content are English, while the specified Portuguese backend field names remain unchanged.

## Executed results

| Check                            | Result and evidence                                                                                                |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Framework version                | Installed Next.js **15.5.28**; no migration to Next.js 16                                                          |
| Strict TypeScript                | `npm run typecheck` passed                                                                                         |
| ESLint                           | `npm run lint` passed without errors or warnings                                                                   |
| Unit/integration/component tests | `npm run test`: **21 passed**, 3 files                                                                             |
| Production build                 | `npm run build` passed; list, creation and edit routes are dynamic                                                 |
| Production browser tests         | `npm run test:e2e`: **8 passed**, Chromium                                                                         |
| Demo walkthrough                 | `npm run demo:screenshots` succeeded on an isolated production server at port 3100                                 |
| Demo records                     | Six fictitious tasks: two overdue, three upcoming, one without a date                                              |
| Demo operations                  | Browser create, edit and delete verified; reminder totals checked; no browser exceptions or error console messages |
| Production dependencies          | `npm audit --omit=dev --audit-level=low`: **0 vulnerabilities**                                                    |
| Complete dependency tree         | `npm audit --json`: **14 moderate** findings in development/lint tooling; **0 high**, **0 critical**               |

Dependency installation was validated with both `npm install` and `npm ci` during implementation. Dependencies remain pinned in the committed lockfile; the final screenshot command adds no runtime dependency.

## What the tests demonstrate

| Requirement / behavior                    | Verification                                                                                                                                       |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Server-side storage and shared repository | A task created over HTTP tRPC is returned by an independent server-rendered page request in the same process                                       |
| Genuine SSR                               | The page HTML contains a real task heading; list, calendar, reminders and edit content remain visible with JavaScript disabled                     |
| CRUD                                      | Browser creation, editing, deletion, cancellation, empty state and success feedback                                                                |
| Validation and errors                     | Blank/whitespace/overlong titles, overlong descriptions, invalid UUIDs, impossible dates, invalid times, missing tasks and failed network requests |
| Immutable creation metadata               | Updates preserve the original ID and creation timestamp                                                                                            |
| Input preservation                        | Failed submission leaves the draft intact and retry succeeds                                                                                       |
| Cursor pagination                         | 25 records, timestamp ties, insertion and deleted cursor boundaries                                                                                |
| Manual and automatic incremental loading  | Fallback button tested with IntersectionObserver disabled; a separate scenario exercises actual automatic scrolling                                |
| No duplicate task cards                   | Multi-page rendered IDs are unique                                                                                                                 |
| Scheduling                                | Add from a chosen day, prefilled date, refresh an edit URL, navigate weeks, jump to a date, move dates, clear date/time and delete scheduled tasks |
| Calendar completeness                     | All 25 scheduled tasks in the requested week are returned, independent of the ten-card first page                                                  |
| Reminder completeness                     | Counts and previews use all stored tasks, including those outside the first list page; edits and date removal refresh the panel                    |
| Responsive layout                         | No horizontal document overflow with long text at 390px, 768px and 1440px on listing/edit pages                                                    |
| Keyboard dialog behavior                  | Escape cancellation, focus restoration and accessible destructive confirmation                                                                     |
| English interface                         | English labels, errors, task examples and `html lang="en-US"`; original Portuguese model keys preserved                                            |
| Local font                                | Nunito font loading asserted in the browser                                                                                                        |

The automatic root loading boundary is intentionally absent. Small in-memory server reads complete before the page is returned, avoiding task content hidden inside streamed fragments that require JavaScript to reveal. Forms and interactive queries still show loading feedback.

Optional values are explicitly replaced during updates so clearing descriptions/schedules works across JSON serialization, which omits undefined keys.

## Actual demo captures

| Image                                                 | Contents                                               |
| ----------------------------------------------------- | ------------------------------------------------------ |
| [Overview](demo/overview.png)                         | Six task cards above the weekly calendar and reminders |
| [Calendar and reminders](demo/calendar-reminders.png) | Timed/all-day tasks and overdue/upcoming groups        |
| [Create](demo/create-task.png)                        | Filled creation form with date and time                |
| [Edit](demo/edit-task.png)                            | Existing task loaded for editing                       |
| [Delete](demo/delete-task.png)                        | Confirmation with Cancel and Delete task               |
| [Mobile](demo/mobile.png)                             | The same sample dataset in the stacked layout          |

These are screenshots of the real application, not mockups. The capture script uses a fresh in-memory repository, performs operations through tRPC/the browser, and stops its own server afterward. It does not inspect or reset another running preview. The samples contain no real personal information.

Native date/time field formatting may follow the browser or operating-system locale. Stored dates remain ISO `YYYY-MM-DD`, and textual dates use English formatting.

## Limits and remaining submission work

- Data is temporary and process-local. A restart loses tasks; separate processes and serverless instances do not share them. No database, file persistence or localStorage source of truth is introduced.
- Reminders are an on-page summary, not browser/email/push notifications. There is no completion-status field; dates before today count as overdue, with that rule shown in the interface.
- Browser automation ran on Chromium. No equivalent Firefox/WebKit or manual screen-reader audit was performed.
- The local collection is sorted per query. This is appropriate for the small assessment, not a large shared persistent service.
- Authentication, registration, recurring events, drag-and-drop scheduling and external integrations remain outside scope.
- Fourteen moderate development-tool findings remain in the Next 15 ESLint/minimatch dependency chain. A blanket incompatible major override was not applied. The production dependency audit is clean; no high/critical findings remain in the audited tree.
- The production test/capture servers emit a harmless terminal warning when the host sets both `NO_COLOR` and `FORCE_COLOR`; no application browser/server failures remained in the final successful runs.
- The theoretical answers and their English PDF submission are separate from this repository. The public GitHub link is also a remaining delivery step. Nothing is deployed or published automatically.
