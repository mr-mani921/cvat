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
| Current result | **Not measured**. No target achievement is claimed. |

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
Annotation import and label compatibility remain prerequisites; no imported annotation total is claimed here.

### Measurement procedure

1. Finish and verify requirements 1-5 before performance work. Use the source-built application, with debug and
   profiling disabled, without cached analytics responses. Keep normal CVAT authentication and authorization enabled.
2. Freeze the tested code and data. Record the tested Git SHA and dirty-tree state, image/build identity, exact endpoint
   URL without filters, task ID, image count, N, per-class reference counts, job layout and counting semantics.
   The endpoint path is not implemented yet; record its actual path before the first warm-up.
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
   values in their original order. No timing values have been collected yet.

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
| Warm-ups 1-3 and raw output | Not measured |
| Measured runs 1, 2, 3, 4, 5 | Not measured |
| Median; minimum; maximum; range | Not measured |
| Target achieved or missed; explanation | Not measured |
| Tested endpoint, build SHA and eligible annotation total N | Not yet available |

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

Missing until measurement: tested source-build identity and SHA, endpoint URL, final annotation counts/semantics,
curl version and command, user role, runtime configuration/workload details and all benchmark output.
