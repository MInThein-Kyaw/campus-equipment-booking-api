# AI_LOG.md

This project was developed with assistance from OpenAI Codex.
I used AI for project setup, implementation, debugging, testing,
and Quality Gate review. I verified the important results by running
the project and tests locally.

## 1. Reading the exam requirements

### Prompt
"Read exam_brief_en.md and rubric_en.md. Do not do anything yet."

### What I used
Codex read the exam requirements and rubric before implementation.

### What I verified
I checked that Codex had not modified any files at this stage.

---

## 2. Initial implementation

### Prompt
"Set up this project using the required TypeScript/Hono stack with
local SQLite/D1. Implement the first working version according to
the exam brief and rubric, including equipment, booking CRUD,
validation, overlap prevention, correct HTTP status codes,
parameterized SQL, and documentation."

### What I used
Codex created the Hono/D1 project structure, database migration,
equipment seed data, booking CRUD routes, validation, overlap
checking, SQL queries, and documentation.

### What I verified
I ran the project locally and confirmed that the API was available at:

http://127.0.0.1:8787/api

I manually tested GET /api/equipment and confirmed that it returned
HTTP 200 with eq-1 and eq-2.

I also manually created a booking and confirmed HTTP 201 Created.

---

## 3. Dependency/setup issue

### What happened
The initial npm install failed because the requested
@cloudflare/workers-types version was unavailable.

### AI assistance
Codex checked the available package version and corrected the
dependency.

### What I verified
I reran npm install successfully.
The local D1 migration completed and TypeScript typecheck passed.

---

## 4. API testing

### Prompt
"Test the first version locally using the required API tests and
check CRUD operations and important error cases."

### What I used
Codex helped run and organize the API tests.

### What I verified
The API produced the expected results for:
- Equipment/list: 200
- Create booking: 201
- Read booking: 200
- Update booking: 200
- Invalid input/time: 400
- Booking conflict: 409
- Missing booking: 404
- Delete booking: 204

---

## 5. Quality Gate review

### Prompt
"Read curl_test_guide.md and quality_gate.md. Review the current
project using the Quality Gate. Run the required tests, fix genuine
issues, and create QUALITY_GATE_REVIEW.md. Do not invent findings
or test results."

### Finding 1 — JSON null handling
Codex found that a JSON null request could cause HTTP 500.

### What I used
Request-body object validation was added.

### What I verified
The same invalid request returned a JSON HTTP 400 response after
the fix.

### Finding 2 — Timestamp normalization
Codex found that ISO timestamps containing offsets could bypass
overlap detection.

### What I used
Booking timestamps were normalized to UTC before comparison/storage.

### What I verified
The offset-based overlapping booking returned HTTP 409 after the fix.

---

## 6. Additional Quality Gate verification

### Prompt
"The Quality Gate requires at least three meaningful improvements.
Find a genuine third improvement, preferably related to Reasoning
or You Own It. Do not invent a problem."

### What I used
Codex identified that PATCH overlap prevention was implemented but
did not yet have focused evidence.

### What I verified
A PATCH request attempting to move one booking into another
booking's time interval returned HTTP 409.

This confirmed that the update overlap check excludes the booking
being updated itself while still detecting conflicts with other
bookings.

---

## Final verification

I reviewed the generated documentation and test evidence.

The final project passed TypeScript type checking and the required
API tests. I also reviewed the important routes, validation rules,
status codes, database queries, and overlap logic so I can explain
the implementation.

---

## 7. Cloudflare deployment

### What I used

Wrangler OAuth authentication, a remote D1 database, the existing
migration, and the existing Hono Worker deployment configuration.

### What I verified

- `npx wrangler whoami` confirmed the authenticated Cloudflare account.
- Remote D1 database `booking-db` was created with ID
	`12cf3491-4cd5-40c8-b8a4-91c65d3fad4f`.
- Migration `0001_initial.sql` applied successfully to the remote D1 database,
	including the two seeded equipment records.
- The Worker deployed successfully as version
	`7a71d20f-ed99-4d7e-9c0d-05dca64f5343`.
- The deployed equipment and booking endpoints passed the recorded smoke tests
	in `TEST_EVIDENCE.md`.

## 8. Final deployed Quality Gate

### What I verified

Against the deployed Base API over IPv4, I tested an invalid time range,
an overlapping booking, and a missing booking. The API returned `400`, `409`,
and `404` respectively, each with the required JSON error shape. The temporary
remote baseline booking was removed with `204` after the conflict test.

## 9. Base API status response

### Request summary

The user requested a simple `GET /api` response showing that the API is running
and listing the equipment and bookings endpoints, followed by typecheck,
regression tests, deployment, live verification, and accurate documentation.

### AI-assisted changes

Codex added one root handler to the existing Hono API router in `src/index.ts`.
It returns HTTP `200` with the requested message and endpoint paths without
querying D1. Codex updated `README.md`, `API_CONTRACT.md`, and
`TEST_EVIDENCE.md` to document this response and the checks actually run.
Existing CRUD, validation, business rules, and schema code were unchanged.

### Checks performed by Codex

- `npm.cmd run typecheck` passed.
- Wrangler initially could not run inside the sandbox; execution with expanded
  permissions allowed the local server and deployment to run.
- An initial Node test command failed due to PowerShell quoting before requests
  were sent; the tests were rerun using stdin.
- The first local equipment check returned `500` because the local tables were
  absent. Codex applied the existing local migration and reran the tests.
- Local and deployed tests passed for the new root response, equipment, full
  booking CRUD, invalid time and equipment (`400`), POST and PATCH conflicts
  (`409`), missing resources and unknown routes (`404`), and deletion (`204`).
- All temporary bookings created by these tests were deleted.
- `npm.cmd run deploy` succeeded with Worker version
  `944b30d9-ea02-482a-8cca-54f12914502a`; deployed `GET /api` returned `200`
  with the exact requested JSON.

These are Codex-run checks; this entry does not claim additional manual
verification by the user.
