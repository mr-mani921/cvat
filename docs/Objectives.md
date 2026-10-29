# Annotation Analytics - Objectives

Established before application implementation or performance measurements.
Source: xis.ai Full Stack Technical Assessment, Version 3.0, sections 3 and 6.

## MO-1: Authenticated task-count endpoint latency

| Field | Entry |
| --- | --- |
| What is measured | Complete HTTP response time for one authenticated task annotation-count request. |
| How | Client-side curl `time_total`, through `http://localhost:8080`, converted from seconds to milliseconds. |
| Target | Median of five measured requests at or below **150 ms**. |
| Conditions | Local source-built CVAT, PostgreSQL and OPA; one client; fixed COCO task; three excluded warm-ups. |
| Not included | Login, image/annotation import, cold start, browser rendering, remote traffic, or concurrent users. |
| Current result | **Achieved for the declared 12-image sample:** median **53.590 ms**; the planned 5,000-image workload remains unmeasured. |

### Justification and dataset

This is one task-scoped database aggregation returning a small per-class response, rather than annotation geometry.
A 150 ms warm median sets a useful budget for a task-page request while including CVAT's authorization overhead.
It leaves part of a short interactive wait for browser work and allows for a shared Docker environment on an older CPU.
It is a hypothesis, not an observed baseline or a guarantee. A miss will be reported honestly with its likely causes;
the target will not be raised after seeing results to turn a miss into a pass.

Use the COCO 2017 validation images and `annotations/instances_val2017.json`, imported through COCO 1.0 into CVAT.
The planned benchmark task has **5,000 images**. If resources require a smaller sample, record the image selection,
reason, image count and revised conditions before measuring. Results apply only to that declared dataset.

The initial scope in the [Plan](Plan.md) is saved labeled shapes. Before benchmarking, record counting semantics,
including job types, overlaps, skeleton elements, unused classes and exclusion of tags/tracks, with a code reference.
The benchmark must exercise those semantics, with more than zero saved shapes and at least two populated classes.
Do not use empty-task timings to claim this target. Determine the exact eligible annotation total N and per-class
reference counts independently from the saved database; image count is not annotation count.

Initial database inspection found 5,000 imported images but zero saved shapes, tags or tracks,
and only the project label `car`.
For that original task, annotation import and label compatibility remain prerequisites.
The separate annotated fallback is declared below.

### Measurement procedure

1. Finish and verify requirements 1-5 before performance work. Use the source-built application, with debug and
   profiling disabled, without cached analytics responses. Keep normal CVAT authentication and authorization enabled.
2. Freeze the tested code and data. Record the tested Git SHA and dirty-tree state, image/build identity, exact endpoint
   URL without filters, task ID, image count, N, per-class reference counts, job layout and counting semantics.
   Record the actual endpoint path before the first warm-up.
3. Record curl version, client OS, service configuration, background workloads and any differences from the machine
   details below. Keep other workloads stable; do not stop unrelated projects merely to improve the result.
4. Authenticate using CVAT's existing login outside the timed requests. Use the same authorized user's session cookie
   or token for every request. Record the user's role/access, never the credential. Do not time the login itself.
5. From Windows PowerShell, use `curl.exe` against localhost, one new process per request and one request at a time.
   Disable retries and redirects; set a 10-second overall timeout. Save each JSON body to a temporary file and print
   `http_code=%{http_code} time_total_s=%{time_total}` with curl's `--write-out` option. Preserve curl's exit code too.
   Record the exact command with credentials replaced by a placeholder, and the working directory.
6. Run exactly **three warm-up requests**, then **five measured requests**, sequentially, with no deliberate delay.
   Label each output by phase and run number. A single measurement is one GET from curl's transfer start through receipt
   of the entire response body. `time_total` includes connection setup, proxy/server processing, authorization, SQL and
   serialization; it excludes process launch and subsequent JSON validation. Keep services running between requests.
7. Check every response for HTTP 200 and valid JSON matching the independent per-class counts and N. A timeout, nonzero
   curl exit, failed request or incorrect body invalidates the batch as success evidence. Preserve the failure;
   after fixing its cause, rerun the entire protocol and retain the earlier attempt rather than cherry-picking timings.
8. Paste raw output for all eight requests into this document, redacting credentials only. Report all five measured
   values in their original order.

Database and filesystem caches may warm naturally. No response cache is permitted to replace database aggregation.
This is a sequential warm-latency check, not a throughput, cold-start or multi-user benchmark.

### Calculation and evidence

For measured times t1 through t5, compute each time in milliseconds as `time_total_s * 1000` without rounding first.
Sort the five values: the third is the median. Report the spread as minimum, maximum and range (`maximum - minimum`).
Display milliseconds to three decimal places, but compare the unrounded median against 150 ms.

Evidence must include the command, raw outputs, exit codes, correctness comparison, machine/build/data conditions,
five values, median and spread. A valid median at or below 150 ms means the target was achieved under those conditions.
A valid median above 150 ms means it was missed; record the result and explanation. An invalid or absent batch remains
unverified. Keep evidence here and link to it from the [Definition of Done](Definition-of-Done.md).

| Result field | Status |
| --- | --- |
| Warm-ups 1-3 and raw output | Exactly three excluded; all eight transfers retained below |
| Measured runs 1, 2, 3, 4, 5 | 57.270, 50.526, 53.590, 52.373, 58.037 ms, in original order |
| Median; minimum; maximum; range | 53.590; 50.526; 58.037; 7.511 ms |
| Target achieved or missed; explanation | **Achieved**, 53.590 <= 150 ms; limited to the predeclared small COCO sample |
| Tested endpoint, build SHA and eligible annotation total N | `/api/test/tasks/2/annotation-counts`; `21ca1ddf1d891ce1970053dbe98db1cdd29fc116`; N=96 |

### Sample and conditions declared before measurement

Declared on 29 October 2026 before warm-up 1. The original **150 ms** median target and eight-request protocol
remain unchanged. Git was clean on `dev-test01` at `21ca1ddf1d891ce1970053dbe98db1cdd29fc116` before this
documentation edit; R5 evidence is committed there. Application source will remain unchanged during measurement.

The predefined smaller-sample fallback is used: task 1 still has 5,000 images and zero saved shapes, and the only
other existing task is task 2. Importing thousands of additional images/annotations is outside this measurement's
time budget. **Task 2 has 12 images, 96 eligible saved rectangles and 26 populated classes.** These results will apply
only to this small sample, not demonstrate performance for 5,000 images, large annotation volumes or concurrent users.

The sample is the first 12 COCO 2017 validation images sorted by image ID:
139, 285, 632, 724, 776, 785, 802, 872, 885, 1000, 1268, 1296. The supported COCO 1.0 import used the existing
bbox projection (copied JSON with segmentation omitted); original COCO data is unchanged. Jobs 2/3/4 cover frames
0-3/4-7/8-11 and hold 43/12/41 shapes, respectively, with no overlap, parent jobs or special job types.

Counting follows `cvat/apps/test/views.py:39`: visible, top-level `LabeledShape` rows in ordinary annotation jobs
without parent jobs; group by saved label ID/name, including project-owned labels. Exclude tags, tracks/keyframes,
intervals, skeleton children, outside shapes, ground-truth and replica jobs; a skeleton parent counts once.
Overlapping jobs would count separate saved rows individually; unused classes are omitted. This rectangle-only
sample exercises ordinary jobs and multiple classes, not those excluded annotation types or overlap edge cases.

| Tested condition | Declared value |
| --- | --- |
| Endpoint | `http://localhost:8080/api/test/tasks/2/annotation-counts`, GET, no filters |
| Client | Windows PowerShell; `C:\WINDOWS\system32\curl.exe` 8.21.0, libcurl 8.21.0, Schannel |
| Authentication | Existing CVAT login outside timing; task owner's normal session; ordinary nonstaff/nonsuperuser account |
| Runtime | `cvat.settings.production`, `DEBUG=false`; no debug toolbar, Silk or response-cache middleware |
| Backend source | Read-only host `cvat/` mount at `/opt/cvat/cvat`; Python executes the committed source |
| Base image | `cvat/server:dev`, `sha256:33441cdd1e4664c53384d82663470f4937b43a41522e1ec50851ae04ac52359f` |
| UI build | Existing source-built `cvat-ui.e8b7b5337300c33b1d9a.min.js`, served from the read-only `cvat-ui/dist` mount; not timed |
| Build qualification | Server dependencies come from the prebuilt base image; no fresh server image build is claimed |
| Services | Existing Traefik, CVAT server, PostgreSQL 15, OPA 1.12.2, Redis, workers and monitoring remain running |
| Docker | Engine 29.9.2; 6 CPUs; 8,327,909,376 bytes (7.76 GiB); WSL2 kernel `6.18.33.2-microsoft-standard-WSL2` |
| Host | i5-8350U, 4 cores/8 logical CPUs; 12,704,616,448 bytes RAM; Windows 11 Pro 10.0.26200, build 26200 |
| Host pressure | Pre-check `FreePhysicalMemory=602048` KiB (587.938 MiB); not a continuous memory measurement |
| Workload | Existing workers/monitoring and host Cursor, Chrome, ChatGPT and Codex processes; no intentional imports, builds or test suites during timing |
| Pre-check snapshot | Server CPU 0.54%, 679.6 MiB; PostgreSQL CPU 0%; OPA 0.05%; ClickHouse 69.53%, 785.9 MiB (`docker stats --no-stream`) |
| WSL inspection limit | Kernel recheck succeeded; distribution `/etc/os-release` recheck timed out (`Wsl/Service/0x8007274c`); Ubuntu 26.04 was verified earlier, not reverified here |

**Difference from the original planned runtime:** the objective specified a source-built CVAT environment.
The actual measurement used the existing prebuilt `cvat/server:dev` image with the submitted backend source mounted
read-only at `/opt/cvat/cvat`. No server image was built from the submitted checkout for this run; the reported
result applies to that source-mounted runtime.

No services or unrelated workloads will be stopped, restarted or tuned. No analytics response caching is configured;
the action calls database aggregation for each permitted request. Database/filesystem caches may warm naturally.
The endpoint and permission adapter's normalized SHA-256 hashes match the committed files in the running mount:

```text
cvat/apps/test/views.py       c3e83d76df72a46599db50ebc2bd4240067bb77e499e25f268f94dc7c76a3ad0
cvat/apps/test/permissions.py a2f75430ca0ad0d7c976aedf3798483c920a4c1d70d91cb0530179c42fa74707
cvat/settings/base.py        3e1198217b6c89199e805bc78775ec1e23c56f73cec92444d5a6f91e79e0429e
```

Before timing, an independent PostgreSQL query joined shape -> job -> segment -> task and shape -> label under a
read-only transaction, applying the eligibility predicates above. It established this exact reference (N=96):

| Label ID | Class | Count |
| --- | --- | --- |
| 2 | person | 31 |
| 3 | car | 1 |
| 4 | truck | 1 |
| 5 | boat | 3 |
| 6 | stop sign | 2 |
| 7 | bird | 1 |
| 8 | bear | 1 |
| 9 | backpack | 3 |
| 10 | handbag | 3 |
| 11 | skis | 1 |
| 12 | sports ball | 1 |
| 13 | baseball glove | 1 |
| 14 | tennis racket | 2 |
| 15 | chair | 6 |
| 16 | potted plant | 3 |
| 17 | bed | 2 |
| 18 | dining table | 1 |
| 19 | tv | 2 |
| 20 | cell phone | 2 |
| 21 | microwave | 1 |
| 22 | oven | 1 |
| 23 | refrigerator | 2 |
| 24 | book | 16 |
| 25 | clock | 2 |
| 26 | vase | 4 |
| 27 | teddy bear | 3 |

At this declaration, timings were **Not measured**. Reference output was retained locally outside Git as
`../analytics-dev/mo1-reference.json`. The measurement start metadata recorded the declaration file's SHA-256 as
`41673AB2983B2A887205E482C49073A1B67B4AEB00B46138220E35E0B442C4C3`, before results were added.

### Completed measurement: 29 October 2026

One batch ran from **17:58:28 to 17:58:31 PKT (UTC+05:00)**, including untimed login and response checks.
The application/data were frozen at the declared SHA and reference above. Only `docs/Objectives.md` was dirty
when requests began, to record those conditions; no application files were modified. No earlier timed attempt,
discarded transfer, retry or replacement batch exists for this objective.

Working directory: `D:\my_codes\full-stack-assessment\cvat`.
The local command was `& D:/my_codes/full-stack-assessment/analytics-dev/measure_mo1.ps1`.
It authenticated once through normal `/api/auth/login` using the existing private account file outside Git,
then passed the same session to each new Windows curl process through stdin, not the process arguments or log.
The per-request command was the following, with the secret stdin represented by a placeholder:

```powershell
$curlConfig = 'cookie = "sessionid=<REDACTED>"'
$curlConfig | & curl.exe --disable --config - --retry 0 --max-time 10 --max-redirs 0 `
    --noproxy '*' --silent --show-error --stderr $stderrPath --output $bodyPath `
    --write-out 'http_code=%{http_code} time_total_s=%{time_total}' `
    'http://localhost:8080/api/test/tasks/2/annotation-counts'
$exitCode = $LASTEXITCODE
```

`$bodyPath` and `$stderrPath` were absolute paths under `../analytics-dev/mo1-run-20261029-01/`, named
`<phase>-<run>.json` and `<phase>-<run>.stderr.txt`. A loop ran `warm-up` 1-3, then `measured` 1-5, without deliberate
delays or concurrent clients. `--disable` ignores curl configuration files, retries are zero, and redirects are not
enabled. Login and validation are outside `time_total`; normal authentication, OPA, proxy, SQL and serialization
remain inside it. The transfer ends only after the full body is saved.

Original request output, in order (the validation line is produced after curl finishes):

```text
warm-up 1
http_code=200 time_total_s=0.130084
exit_code=0
validation=True task_id=2 total=96 classes=26
warm-up 2
http_code=200 time_total_s=0.057840
exit_code=0
validation=True task_id=2 total=96 classes=26
warm-up 3
http_code=200 time_total_s=0.059202
exit_code=0
validation=True task_id=2 total=96 classes=26
measured 1
http_code=200 time_total_s=0.057270
exit_code=0
validation=True task_id=2 total=96 classes=26
measured 2
http_code=200 time_total_s=0.050526
exit_code=0
validation=True task_id=2 total=96 classes=26
measured 3
http_code=200 time_total_s=0.053590
exit_code=0
validation=True task_id=2 total=96 classes=26
measured 4
http_code=200 time_total_s=0.052373
exit_code=0
validation=True task_id=2 total=96 classes=26
measured 5
http_code=200 time_total_s=0.058037
exit_code=0
validation=True task_id=2 total=96 classes=26
```

All eight JSON bodies had `task_id=2`, `total=96`, and every label ID/name/count exactly matching the 26-row
independent PostgreSQL reference; no class was omitted. Every HTTP status was 200, every curl exit was 0 and every
stderr file was empty. A second read-only SQL query after the batch exactly matched the pre-measurement reference.

The independent reference SQL, executed through `docker exec cvat_db psql -U root -d cvat -X -A -t` inside
`BEGIN READ ONLY` / `ROLLBACK`, was:

```sql
SELECT s.label_id, l.name AS label_name, count(*) AS count
FROM engine_labeledshape s
JOIN engine_label l ON l.id = s.label_id
JOIN engine_job j ON s.job_id = j.id
JOIN engine_segment seg ON j.segment_id = seg.id
WHERE seg.task_id = 2 AND j.type = 'annotation' AND j.parent_job_id IS NULL
  AND s.parent_id IS NULL AND NOT s.outside
GROUP BY s.label_id, l.name ORDER BY s.label_id;
```

The saved JSON was revalidated independently in Node.js against that reference, including all eight responses,
original run order, raw curl text, exit codes and empty stderr. PowerShell used decimal arithmetic; the independent
calculation parsed curl's six-decimal seconds as integer microseconds, avoiding floating-point rounding before comparison.

| Calculation | Value |
| --- | --- |
| Seconds -> milliseconds | Multiply each measured `time_total_s` by 1000 |
| Five measured values, original order | 57.270, 50.526, 53.590, 52.373, 58.037 ms |
| Sorted values | 50.526, 52.373, **53.590**, 57.270, 58.037 ms |
| Median (third of five) | **53.590 ms** |
| Minimum / maximum | 50.526 / 58.037 ms |
| Range (`58.037 - 50.526`) | **7.511 ms** |
| Unrounded comparison | 53,590 microseconds <= 150,000 microseconds: **achieved** |

Both calculations agree. The target is achieved for the declared 96-shape sample under these local conditions.
It does not establish the target for 5,000 annotated images, large shape counts, cold starts or concurrent users.
Resource-pressure snapshots describe the environment, not measured causes of individual request times; no causal
performance explanation or throughput claim is made. No caching, implementation optimization or target change was used.

All raw output, eight bodies, stderr files, metadata, result JSON and independent recalculation are retained locally
outside Git under `../analytics-dev/mo1-run-20261029-01/`. The tables, complete transfer output, reference counts,
command and conditions above are the repository evidence; private credentials and session values are excluded.

## Machine and repository information

Verified on 29 October 2026. Recheck and record changes when measurements are actually taken.
Host-visible RAM and Docker-visible memory are separate limits, not measurements of currently free memory.

| Field | Verified value |
| --- | --- |
| CPU | Intel Core i5-8350U CPU @ 1.70 GHz; 4 cores, 8 logical processors |
| Host RAM | 12,704,616,448 bytes (approximately 11.83 GiB) |
| Host OS | Microsoft Windows 11 Pro, version 10.0.26200, build 26200 |
| WSL distribution | Ubuntu 26.04 LTS |
| WSL kernel | 6.18.33.2-microsoft-standard-WSL2 |
| Docker resources | 6 CPUs; 8,327,909,376 bytes of memory (approximately 7.76 GiB) |
| Fork | `https://github.com/mr-mani921/cvat` |
| Working branch | `dev-test01` |
| Cloned baseline CVAT SHA | `4a09e27ff869b7aebbfdb07b29c4a34904a0221d` |
| HEAD when these objectives were established | `d817d4170b140606e228504289823a7ee0706f34` |

Raw machine-inspection output for selected fields, with the distribution-name excerpt from `/etc/os-release`:

```text
Get-CimInstance Win32_Processor | Select-Object Name,NumberOfCores,NumberOfLogicalProcessors | ConvertTo-Json -Compress
{"Name":"Intel(R) Core(TM) i5-8350U CPU @ 1.70GHz","NumberOfCores":4,"NumberOfLogicalProcessors":8}
Get-CimInstance Win32_ComputerSystem | Select-Object TotalPhysicalMemory | ConvertTo-Json -Compress
{"TotalPhysicalMemory":12704616448}
Get-CimInstance Win32_OperatingSystem | Select-Object Caption,Version,BuildNumber | ConvertTo-Json -Compress
{"Caption":"Microsoft Windows 11 Pro","Version":"10.0.26200","BuildNumber":"26200"}
docker info --format 'Docker CPUs={{.NCPU}} memory_bytes={{.MemTotal}}'
Docker CPUs=6 memory_bytes=8327909376
wsl --exec uname -r
6.18.33.2-microsoft-standard-WSL2
wsl --exec cat /etc/os-release
PRETTY_NAME="Ubuntu 26.04 LTS"
```

The measurement-time source/build identity, SHA, endpoint, counts/semantics, curl version/command, user role,
runtime conditions and completed output are recorded above. The earlier machine snapshot is preserved;
the WSL distribution recheck limitation is declared with the measurement conditions.
