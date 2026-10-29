# Annotation Analytics — Implementation Plan

**Assessment:** xis.ai Full Stack Technical Assessment, Version 3.0; **branch:** `dev-test01`.

**Baseline CVAT commit:** `4a09e27ff869b7aebbfdb07b29c4a34904a0221d`.

**Assessment window:** 29 October 2026, 13:29–21:29 PKT

Original plan committed first in `d817d4170`. Finalization edit: condensed its presentation to one page and added
the decision record below; the original sequence, budgets and scope priorities are preserved, not actual timings.

Extend CVAT with a database-backed per-class task-count API and an integrated React graph. Prioritize correctness,
CVAT integration, evidence and clear documentation over optional functionality.

## Implementation sequence and time budget

| Stage | Budget | Work |
|---|---:|---|
| 1. Preparation and documentation | 30 min | Inspect source, dataset and environment; create branch, Plan and acceptance criteria |
| 2. Development setup and data | 80 min | Import manageable COCO sample; verify annotations; source-based development |
| 3. Backend | 90 min | New `test` app, database aggregation, known-count tests |
| 4. Frontend | 75 min | Task-specific React page, API request, bar chart |
| 5. Reliability and access | 55 min | Empty/error states; existing authentication and task authorization; rejection tests |
| 6. Measurement | 45 min | Justify speed target; five runs and raw evidence |
| 7. Additional functionality | 25 min | Job filter after core requirements work |
| 8. Finalization | 80 min | Evidence, code/Git review, fork PR, Loom and submission |
| **Total** | **480 min** | **8 hours** |

Preparation and dataset verification began during the initial assessment window. Actual deviations and unfinished
work are recorded in Objectives and Definition of Done.

## Technical approach

Use existing CVAT models in `cvat/apps/test`; group saved labeled shapes by label ID/name in Django ORM.
Other annotation types are not silently mixed in. Reuse React, a class-count bar chart and existing authentication
and task access. Compare known counts; test empty, failed and rejected requests. Measure endpoint latency five
times under documented conditions, with median and spread.

## Deliberate scope limits

R1–R4 are the baseline; authentication, measurement and filtering follow. WebSocket updates and recovery were
conditional on preserving correctness and submission time. No unrelated functionality or schema changes were planned.
Completion requires observable evidence, with unfinished work disclosed in Definition of Done.

## Final decision record — 29 October 2026 (R10)

Chose database aggregation of persisted shapes, exposed through CVAT permissions and its existing SDK/page.
Rejected fetching every job's complete annotation geometry and counting in React. That alternative could reuse
loaded-collection statistics, but increases payload and client memory and depends on loading every job.
Rejecting it costs a backend query and permission adapter to maintain, plus an explicit saved-shape counting
contract; tags/tracks and export-style overlap deduplication remain outside that contract.
Implemented in `cvat/apps/test/views.py:43–75` and `cvat-core/src/server-proxy.ts:2531`.

R1–R7 are the final implemented scope. R8 and R9 were intentionally not implemented: secure WebSocket delivery,
annotation-save notifications and reconnection/resynchronization required additional infrastructure and verification
beyond the remaining time. The page uses authenticated requests and explicit refresh/navigation, not live updates.
