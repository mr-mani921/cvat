# Annotation Analytics - Definition of Done

## Acceptance criteria established before implementation

Written before application implementation against xis.ai Full Stack Technical Assessment, Version 3.0.
An unchecked item is pending, not passed. Check an item only after its acceptance criteria are verified and actual
evidence is recorded beside it: test output, a number with its method, a commit/file reference or a working link.
The evidence descriptions below are requirements for future verification, not claims that verification has happened.

Follow the assessment order. Requirements 1-4 are the minimum functional baseline; later features do not compensate
for an incomplete baseline. Plan access control from the first endpoint. WebSocket work must wait for that baseline.
An honest performance miss or explicitly declared unfinished requirement is not a fabricated pass.

## Functional requirements

- [ ] **R1 - Database-backed task counts.** A new Django app named `test` inside CVAT exposes a task-specific API
  returning correct per-class saved-annotation counts from CVAT's database, with no hardcoded counts or duplicate store.
  State the initial saved-shape scope from the Plan and explicitly define tags/tracks, skeleton elements, special jobs,
  overlaps and unused-label behavior. Project-owned labels must not cause cross-task leakage.
  **Evidence required:** endpoint/code references; automated known-count and isolation tests; actual response compared
  with independent database counts for a COCO task; saved-annotation change reflected by a later request.
- [ ] **R2 - Integrated React page.** A reachable task-specific page in the existing React application calls the real
  endpoint for the selected task and displays its returned data; no separate frontend or static substitute.
  **Evidence required:** route/API integration references, browser request/response and live navigation demonstration.
- [ ] **R3 - Class-count graph.** The page plots class names against their actual counts, with readable labels and
  values consistent with the API response.
  **Evidence required:** screenshot or Loom timestamp plus matching response and relevant frontend check output.
- [ ] **R4 - Empty and failed requests.** A task with no eligible annotations presents a clear no-data state.
  A failed request presents a clear error, never a misleading zero-count graph or stale success presented as current.
  **Evidence required:** reproducible steps and observed results for both cases, with relevant automated tests.
- [ ] **R5 - Existing login and task access.** Use CVAT authentication and task permissions. Allow an authorized user;
  refuse an anonymous request and an authenticated user without access to that task, without disclosing counts.
  **Evidence required:** tests exercising actual authorization, status/body outputs for all three cases, and live
  rejection demonstrations. Do not include passwords, session cookies or tokens in evidence.
- [ ] **R6 - Endpoint speed measured.** Evaluate MO-1 using its predefined dataset, protocol, three excluded warm-ups
  and five measured requests. Report median and spread, raw output and conditions; say achieved or missed with reasons.
  **Evidence required:** completed [MO-1 results](Objectives.md#calculation-and-evidence), tested SHA and correctness
  checks. This item records a valid, honest evaluation; a missed target must remain explicitly marked missed.
- [ ] **R7 - Additional filter or grouping.** Implement one useful dimension beyond plain per-class counts, explain
  the choice and demonstrate that it changes results correctly while preserving task access boundaries.
  **Evidence required:** code reference, rationale, known-result tests and actual filtered/grouped responses.
- [ ] **R8 - WebSocket updates.** Saving annotation changes causes the open graph to update through WebSocket events
  without a manual refresh, with authenticated, authorized task scoping.
  **Evidence required:** WebSocket/request-flow references, relevant automated tests and a live save-to-graph demo.
- [ ] **R9 - Reconnection and recovery.** After a connection loss, the page reconnects and resynchronizes with saved
  database state, including changes missed during disconnection, without duplicated counts or stale final state.
  **Evidence required:** disconnect/change/reconnect steps, relevant automated tests and comparison with a fresh API
  response after recovery.
- [ ] **R10 - Decision record.** Close [Plan.md](Plan.md) with the actual chosen approach, a rejected alternative and
  the concrete cost or trade-off of rejecting it.
  **Evidence required:** Plan section and commit/code references consistent with the delivered implementation.

## Setup, documentation and verification

- [x] **Plan committed first.** The first assessment commit contains the Plan and no application implementation.
  **Verified evidence:** `d817d4170b140606e228504289823a7ee0706f34` adds only `docs/Plan.md`; it is the sole commit
  after baseline `4a09e27ff869b7aebbfdb07b29c4a34904a0221d` at the initial documentation review.
  Reproduce with `git log --reverse --oneline 4a09e27ff..d817d4170` and `git show --stat d817d4170`.
- [ ] **All three assessment documents delivered.** `docs/Plan.md`, `docs/Objectives.md` and
  `docs/Definition-of-Done.md` exist on the submitted branch and have their specified content; keep the Plan concise.
  Record actual deviations rather than rewriting history. This checklist must predate application implementation.
  **Evidence required:** submitted file links and commit history.
- [ ] **COCO sample ready.** Use COCO 2017 validation images and COCO 1.0 annotation import; record the actual image
  count and eligible saved annotation total. Open a job and verify labeled boxes on an image.
  **Evidence required:** task/job IDs, import outcome, counts with method and screenshot or Loom timestamp.
  The initially inspected task's 5,000 images with zero saved annotations do not satisfy this item.
- [ ] **Appropriate tests and reproducibility.** Run focused backend tests and relevant frontend checks, plus runtime
  verification of the claimed requirements. Record commands, environment, actual outputs, failures and limitations.
  Preserve unrelated Docker projects and data. No claim of passing checks that were not run.
  **Evidence required:** commands/output and steps here or in Objectives, tied to tested commits.
- [ ] **Authentic evidence and declared limits.** All reported measurements come from the submitted work and machine.
  Each reported performance objective has five genuine runs, raw output, median/spread and machine/baseline details.
  Every completed checklist item has evidence; unfinished work and its reason remain visible.
  **Evidence required:** final checklist audit and [Objectives](Objectives.md), with no unsupported completion claims.

## Git, recording and submission

- [ ] **Progressive Git history.** Work stays on `dev-test01`; meaningful commits explain what changed and why.
  History shows development in steps, not one large final commit or finished code in the first assessment commit.
  **Evidence required:** final branch and chronological commit log.
- [ ] **Public fork and correct PR.** One PR goes from `mr-mani921/cvat:dev-test01` into `mr-mani921/cvat:main`.
  Verify that `main` exists with the intended baseline and review the diff. No PR goes to upstream CVAT.
  **Evidence required:** public fork and PR links, with visible base/head owner and branch names.
- [ ] **One Loom, no longer than five minutes.** Show the feature live, then follow an actual request from page to
  database and back, and answer K1-K4 on camera without notes. Aim for the PDF's approximate 1 / 1.5 / 2.5 minute
  allocation within the five-minute maximum. Verify the link is viewable and the explanation matches the repository.
  **Evidence required:** accessible Loom link, verified duration and timestamps for the demo, request flow and answers.
- [ ] **K1 - Count location and rationale.** Explain the actual file and line computing per-class counts and why it
  belongs there. **Evidence required:** Loom timestamp and matching submitted file/line reference.
- [ ] **K2 - Models and relationship.** Name the model and field storing a drawn shape's label and explain the actual
  task-to-label-name path. **Evidence required:** Loom timestamp and matching model/query references.
- [ ] **K3 - Reversible decision.** Name one decision in the submitted code you would reverse and its change cost.
  **Evidence required:** Loom timestamp and a real code reference consistent with that answer.
- [ ] **K4 - Learning.** Name something you did not understand and what you did about it; describe real investigation.
  **Evidence required:** Loom timestamp and an honest account grounded in the work performed.
- [ ] **Final reply before the fixed deadline.** Reply to the assessment sender's original message with the PR and
  Loom links by **29 October 2026, 21:29 PKT (UTC+05:00)**, from the acknowledged start at 13:29 PKT.
  **Evidence required:** actual sent reply timestamp and links.

Missing documents, nonprogressive commits, a missing/overlong/failed recording, impossible numbers or an upstream PR
are automatic rejection conditions in PDF section 9. A confident explanation contradicted by the code fails recording
review. Inspect these conditions explicitly before marking submission ready.

## Current limitations and unfinished work

All R1-R10 items are pending: application implementation has not started. COCO annotation import, the source/test
workflow, performance evidence, recording, fork `main` setup, PR and final reply remain outstanding.
R8-R9 are stretch goals in the committed Plan; if omitted, retain their unchecked state and record the actual reason.
Record the final stopping point and reasons for unfinished work at submission.
