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

- [x] **R1 - Database-backed task counts.** A new Django app named `test` inside CVAT exposes a task-specific API
  returning correct per-class saved-annotation counts from CVAT's database, with no hardcoded counts or duplicate store.
  State the initial saved-shape scope from the Plan and explicitly define tags/tracks, skeleton elements, special jobs,
  overlaps and unused-label behavior. Project-owned labels must not cause cross-task leakage.
  **Evidence required:** endpoint/code references; automated known-count and isolation tests; actual response compared
  with independent database counts for a COCO task; saved-annotation change reflected by a later request.
  **Verified evidence:** [Requirement 1 verification](#requirement-1-verification): 15 passing tests, task 2's
  96 imported shapes matching COCO and PostgreSQL, and a saved change observed as 96 -> 97 -> 96.
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
- [x] **COCO sample ready.** Use COCO 2017 validation images and COCO 1.0 annotation import; record the actual image
  count and eligible saved annotation total. Open a job and verify labeled boxes on an image.
  **Evidence required:** task/job IDs, import outcome, counts with method and screenshot or Loom timestamp.
  The initially inspected task's 5,000 images with zero saved annotations do not satisfy this item.
  **Verified evidence:** separate task 2 has 12 images and 96 imported rectangles; job 2 was opened and its labeled
  boxes visually inspected on `000000000139.jpg`. See the [import evidence](#live-coco-verification).
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

R1 is verified locally as recorded below. R2-R10 remain unchecked. The frontend, formal performance measurements,
recording, fork `main` setup, PR and final reply remain outstanding. The original 5,000-image task is preserved;
its COCO annotations have not been imported. The 12-image sample is validation data, not an MO-1 benchmark result.
R8-R9 are stretch goals in the committed Plan; if omitted, retain their unchecked state and record the actual reason.
Record the final stopping point and reasons for unfinished work at submission.

## Requirement 1 verification

Verified on 29 October 2026, using the working tree based on documentation commit `3c8d962a9`.
The acceptance criteria above were established in that earlier commit.

### API and counting contract

`GET /api/test/tasks/{id}/annotation-counts` returns `task_id`, `total`, and `counts`.
Each count contains `label_id`, `label_name`, and `count`. Only populated classes are returned, ordered by label ID.
Empty tasks return their task ID, `total: 0`, and `counts: []`. Missing or malformed IDs return 404;
anonymous requests return 401, authenticated users without task access return 403, and POST returns 405.

[The aggregation](../cvat/apps/test/views.py) groups `LabeledShape` rows by `label_id` and `label__name` and counts
their IDs in SQL. The task boundary is `shape.job.segment.task`, not `label.task`; project-owned labels therefore work.
Include only `outside=False`, top-level shapes, in `annotation` jobs with no parent job. Exclude tags, tracks and their
keyframes, intervals, skeleton children, ground-truth jobs and replicas. A skeleton parent counts once.
Separate saved rows on overlapping job frames count separately; no export-time object deduplication is claimed.
The total is summed from the grouped rows, without loading annotation geometry or making a second count query.

The view calls `get_object()` before aggregation. The existing authenticated DRF defaults and CVAT `PolicyEnforcer`
apply; [the permission adapter](../cvat/apps/test/permissions.py) selects task `view:annotations`, reusing task OPA
rules and CVAT's access-token policy checks. There are no custom role shortcuts or permission mocks.

### Development and tests

Only `cvat_server` was recreated, using the existing image and a read-only mount of `./cvat` at `/opt/cvat/cvat`.
The local, ignored `docker-compose.override.yml` contains:

```yaml
services:
  cvat_server:
    environment:
      PYTHONDONTWRITEBYTECODE: '1'
    volumes:
      - ./cvat:/opt/cvat/cvat:ro
```

Executed from the repository in PowerShell:

```powershell
docker compose -f docker-compose.yml -f docker-compose.dev.yml `
  -f docker-compose.override.yml up -d --no-deps --no-build cvat_server
```

The prebuilt image's engine models, task permissions, IAM permissions and original base settings matched the checkout
after line-ending normalization. Its image ID is
`sha256:33441cdd1e4664c53384d82663470f4937b43a41522e1ec50851ae04ac52359f`.
Django loaded `/opt/cvat/cvat/apps/test/views.py`; its SHA-256 matched the host file:
`c3e83d76df72a46599db50ebc2bd4240067bb77e499e25f268f94dc7c76a3ad0`.
The generated schema includes `/api/test/tasks/{id}/annotation-counts` and the two response serializers.

A separate local test image, `cvat/analytics-tests:local`, extends that image with development/test tools.
Its Dockerfile is outside Git at `../analytics-dev/Dockerfile.tests`; to reproduce the image, use:

```dockerfile
FROM cvat/server:dev
USER root
RUN python3 -m ensurepip && python3 -m pip install --no-cache-dir \
    django-extensions==4.1 django-silk==5.4.0 'fakeredis[lua]==2.40.0' black==26.3.1 isort==7.0.0
USER 1000:1000
ENV PYTHONDONTWRITEBYTECODE=1
```

```powershell
docker build -f ../analytics-dev/Dockerfile.tests -t cvat/analytics-tests:local ../analytics-dev
docker run --rm --entrypoint python3 --network container:cvat_opa `
  --mount 'type=bind,source=D:/my_codes/full-stack-assessment/cvat,target=/opt/cvat,readonly' `
  -e CVAT_BASE_DIR=/tmp -e PYTHONDONTWRITEBYTECODE=1 cvat/analytics-tests:local `
  /opt/cvat/manage.py test cvat.apps.test --settings cvat.settings.testing -v 2
```

The test runner uses an isolated in-memory SQLite database, fake Redis queues, temporary storage and local test caches.
Sharing OPA's network namespace makes CVAT's development `localhost:8181` setting reach real OPA.
No production database, queue or cache is cleared by the tests.
[The 15 tests](../cvat/apps/test/tests/test_annotation_counts.py) cover multiple classes/jobs, empty data,
task isolation, project labels, invalid IDs, authentication, denied access before aggregation, task/project access,
annotation/job
exclusions, overlapping jobs, fresh saved values/label names, one SQL aggregation query and unsupported writes.
Both focused runs passed; the final run included interval and legacy parented-job exclusions. Final output excerpt:

```text
Ran 15 tests in 0.973s

OK
System check identified no issues (0 silenced).
```

Black reported `8 files would be left unchanged.` Isort passed after setting a container-only Git safe-directory
exception for the Windows bind mount; no host/global Git configuration was changed. Checks executed:

```powershell
docker run --rm --entrypoint python3 `
  --mount 'type=bind,source=D:/my_codes/full-stack-assessment/cvat,target=/opt/cvat,readonly' `
  -w /opt/cvat cvat/analytics-tests:local -m black --check cvat/apps/test
docker run --rm --entrypoint python3 `
  --mount 'type=bind,source=D:/my_codes/full-stack-assessment/cvat,target=/opt/cvat,readonly' `
  -w /opt/cvat -e GIT_CONFIG_COUNT=1 -e GIT_CONFIG_KEY_0=safe.directory `
  -e GIT_CONFIG_VALUE_0=/opt/cvat cvat/analytics-tests:local -m isort --check-only cvat/apps/test
docker exec cvat_server python3 /opt/cvat/manage.py check
docker exec cvat_server python3 /opt/cvat/manage.py makemigrations --check --dry-run
git diff --check
```

Django reported no system-check issues and `No changes detected` for migrations. An existing upstream test migration
emitted a naive-datetime warning; it did not fail the tests. No application-test failures required a code fix.

### Live COCO verification

A reproducible sample uses the first 12 validation images sorted by original COCO image ID:
139, 285, 632, 724, 776, 785, 802, 872, 885, 1000, 1268, 1296.
Filter annotations to those image IDs and categories to the referenced category IDs. Remove only `segmentation` from
the copied annotations, preserving original bounding boxes and IDs, so COCO 1.0 imports one rectangle per instance.
The original dataset was not modified. Sample ZIP, filtered JSON and manifest are outside Git in
`../coco-data/analytics-subset/`. This is a bbox projection, not a claim to import segmentation masks.

Two dedicated unprivileged accounts were created for verification. Through CVAT's existing login and task APIs,
the owner created task 2, uploaded `images.zip`, and imported `instances_subset_boxes.json` with `format=COCO 1.0`.
Both background operations finished successfully. The task has 12 images, segment size 4, overlap 0 and 26 populated
classes. Jobs 2, 3 and 4 have 43, 12 and 41 saved shapes respectively.
Opening [job 2](http://localhost:8080/tasks/2/jobs/2) through the regular CVAT login showed labeled boxes on
`000000000139.jpg` (20 objects on frame 0); a local screenshot was inspected.

Observed response from `GET http://localhost:8080/api/test/tasks/2/annotation-counts` (HTTP 200):

```json
{
  "task_id": 2,
  "total": 96,
  "counts": [
    {"label_id": 2, "label_name": "person", "count": 31},
    {"label_id": 3, "label_name": "car", "count": 1},
    {"label_id": 4, "label_name": "truck", "count": 1},
    {"label_id": 5, "label_name": "boat", "count": 3},
    {"label_id": 6, "label_name": "stop sign", "count": 2},
    {"label_id": 7, "label_name": "bird", "count": 1},
    {"label_id": 8, "label_name": "bear", "count": 1},
    {"label_id": 9, "label_name": "backpack", "count": 3},
    {"label_id": 10, "label_name": "handbag", "count": 3},
    {"label_id": 11, "label_name": "skis", "count": 1},
    {"label_id": 12, "label_name": "sports ball", "count": 1},
    {"label_id": 13, "label_name": "baseball glove", "count": 1},
    {"label_id": 14, "label_name": "tennis racket", "count": 2},
    {"label_id": 15, "label_name": "chair", "count": 6},
    {"label_id": 16, "label_name": "potted plant", "count": 3},
    {"label_id": 17, "label_name": "bed", "count": 2},
    {"label_id": 18, "label_name": "dining table", "count": 1},
    {"label_id": 19, "label_name": "tv", "count": 2},
    {"label_id": 20, "label_name": "cell phone", "count": 2},
    {"label_id": 21, "label_name": "microwave", "count": 1},
    {"label_id": 22, "label_name": "oven", "count": 1},
    {"label_id": 23, "label_name": "refrigerator", "count": 2},
    {"label_id": 24, "label_name": "book", "count": 16},
    {"label_id": 25, "label_name": "clock", "count": 2},
    {"label_id": 26, "label_name": "vase", "count": 4},
    {"label_id": 27, "label_name": "teddy bear", "count": 3}
  ]
}
```

All 26 counts matched both the filtered source JSON and the following independent PostgreSQL query for task 2:

```sql
SELECT s.label_id, l.name, COUNT(s.id)
FROM engine_labeledshape s
JOIN engine_label l ON l.id = s.label_id
JOIN engine_job j ON j.id = s.job_id
JOIN engine_segment seg ON seg.id = j.segment_id
WHERE seg.task_id = 2 AND j.type = 'annotation' AND j.parent_job_id IS NULL
  AND s.parent_id IS NULL AND NOT s.outside
GROUP BY s.label_id, l.name ORDER BY s.label_id;
```

Observed saved-change verification through the existing annotation PATCH API:

```text
Saved change through API: total 96 -> 97; car 1 -> 2
Removed only the temporary verification shape: total restored to 96
Independent PostgreSQL SQL comparison: MATCH
Shapes by job: {"2": 43, "3": 12, "4": 41}
```

The owner received 200; an anonymous request received 401 with no credentials provided, the unrelated authenticated
user received 403, and missing task 999999 received 404. Host-side PowerShell confirmed the same 200 response through
localhost's proxy. The sample owner also received 403 for original task 1, confirming it did not gain access.
No credentials or session values are included here. These are correctness checks, not formal MO-1 measurements.
