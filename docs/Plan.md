# Annotation Analytics — Implementation Plan

**Assessment:** xis.ai Full Stack Technical Assessment, Version 3.0  
**Branch:** `dev-test01`  
**Baseline CVAT commit:** `4a09e27ff869b7aebbfdb07b29c4a34904a0221d`  
**Assessment window:** 29 October 2026, 13:29–21:29 PKT

## Objective

Extend the existing CVAT application with task-level annotation analytics: a database-backed API returning per-class annotation counts and a React page displaying those counts as a graph.

Prioritize correct behavior, integration with CVAT, demonstrable evidence, and clear documentation over completing every optional requirement.

## Implementation sequence and time budget

| Stage | Budget | Work |
|---|---:|---|
| 1. Preparation and documentation | 30 min | Validate dataset and environment, inspect source structure, create branch, write Plan and initial Definition of Done |
| 2. Development setup and data | 80 min | Create a manageable COCO sample task, verify annotations, configure source-based development |
| 3. Backend | 90 min | Add the `test` Django app, implement database aggregation and test known counts |
| 4. Frontend | 75 min | Integrate a task-specific React page, API request and bar chart |
| 5. Reliability and access | 55 min | Implement empty/error states, reuse CVAT authentication and task authorization, verify rejection cases |
| 6. Measurement | 45 min | Set and justify an endpoint-speed target, run five measurements, preserve raw results |
| 7. Additional functionality | 25 min | Add a job-level filter if core requirements are complete |
| 8. Finalization | 80 min | Update Objectives and Definition of Done with evidence, review code and commits, create fork PR, record Loom and submit |
| **Total** | **480 min** | **8 hours** |

Timing is an allocation, not a claim that each stage was completed in that period. Preparation and dataset verification began during the initial assessment window. Actual deviations and unfinished work will be documented.

## Technical approach

- **Backend:** New Django app `cvat/apps/test`, using CVAT's existing models and database.
- **Initial annotation scope:** Saved labeled shapes belonging to a task's jobs. Other annotation types will not be silently mixed into this count.
- **Aggregation:** Database-level grouping by label ID and name, using Django ORM.
- **Frontend:** Integrate with the existing React application, rather than creating a separate standalone app.
- **Visualization:** Bar chart showing annotation counts per class.
- **Security:** Reuse CVAT's authentication and task-access mechanisms.
- **Validation:** Compare results against known annotations; test empty, failed, unauthenticated and unauthorized requests.
- **Performance:** Measure a specified endpoint under documented local conditions, five times, recording median and spread.

## Deliberate scope limits

The first four functional requirements are mandatory implementation priorities. Authentication, measurement and one additional grouping follow when these work.

WebSocket-based live updates and reconnection recovery are stretch goals and will be skipped if completing them would compromise correctness, documentation, or timely submission.

No unrelated CVAT functionality or database schema changes are planned.

## Completion criteria

Working functionality must be demonstrated with observable evidence. Unfinished requirements and deviations will be recorded in the Definition of Done.

If requirement 10 is reached, a final decision record will be appended here describing the selected approach, rejected alternative, and trade-off.