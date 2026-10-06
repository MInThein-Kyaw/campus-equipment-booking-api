# Test Evidence

Test date: 2026-10-06  
Base URL: `http://127.0.0.1:8787/api`  
Client: PowerShell `Invoke-WebRequest -UseBasicParsing` (the guide permits another HTTP client)

The final run used a fresh `2026-10-28` time window. The local database already contained two earlier test bookings; they were not deleted.

## Official guide workflow

```text
1 equipment list|200|[{"id":"eq-1","name":"Projector A","location":"Building 1"},{"id":"eq-2","name":"Camera Kit B","location":"Media Lab"}]
2 booking list|200|[{"id":"ed166911-f4cb-435b-8f56-cbd7af7e5f80","equipmentId":"eq-1","borrowerName":"Min","startAt":"2026-10-20T09:00:00.000Z","endAt":"2026-10-20T11:00:00.000Z","purpose":"Class presentation"},{"id":"93b1df77-b98d-4448-8c42-9f570cdc027d","equipmentId":"eq-1","borrowerName":"Guide Test","startAt":"2026-10-22T09:00:00.000Z","endAt":"2026-10-22T11:00:00.000Z","purpose":"Guide create test"}]
3 create|201|{"id":"38ec9128-eb07-409a-97c9-38c2b84d8a23","equipmentId":"eq-1","borrowerName":"Final Guide Test","startAt":"2026-10-28T09:00:00.000Z","endAt":"2026-10-28T11:00:00.000Z","purpose":"Final create test"}
4 get one|200|{"id":"38ec9128-eb07-409a-97c9-38c2b84d8a23","equipmentId":"eq-1","borrowerName":"Final Guide Test","startAt":"2026-10-28T09:00:00.000Z","endAt":"2026-10-28T11:00:00.000Z","purpose":"Final create test"}
5 update|200|{"id":"38ec9128-eb07-409a-97c9-38c2b84d8a23","equipmentId":"eq-1","borrowerName":"Final Guide Test","startAt":"2026-10-28T12:00:00.000Z","endAt":"2026-10-28T14:00:00.000Z","purpose":"Final update test"}
6 invalid time|400|{"error":"startAt must be before endAt"}
7 overlap|409|{"error":"Booking time conflicts with an existing booking"}
8 missing booking|404|{"error":"Booking not found"}
10 null JSON body|400|{"error":"Request body must be a JSON object"}
9 delete|204|
11 deleted lookup|404|{"error":"Booking not found"}
```

## Focused regression evidence

- `npm run typecheck` passed after the fixes.
- Before the request-parser fix, JSON `null` returned `500`; after the fix it returned `400` JSON.
- Before timestamp normalization, an overlapping offset-form booking returned `201`; after normalization the same test returned `409`.
- A focused PATCH-overlap test created `eq-2` bookings for 09:00–11:00 and 12:00–14:00, attempted to move the second booking to 10:00–12:30, and received `409` with `{ "error": "Booking time conflicts with an existing booking" }`. Both temporary records were deleted.
- The final test booking `38ec9128-eb07-409a-97c9-38c2b84d8a23` was deleted, and the follow-up lookup returned `404`.

## Cloudflare deployment evidence

Deployment date: 2026-10-06  
Base URL: `https://campus-equipment-booking-api.internship-api.workers.dev/api`  
Worker version: `7a71d20f-ed99-4d7e-9c0d-05dca64f5343`  
Remote D1 ID: `12cf3491-4cd5-40c8-b8a4-91c65d3fad4f`

The existing migration applied successfully to the remote D1 database. The remote smoke test used `curl.exe -4` and a temporary booking that was deleted afterward:

```text
GET /equipment       -> 200; returned eq-1 and eq-2
GET /bookings        -> 200; returned [] before the test booking
POST /bookings       -> 201; created 8ae210d8-37e8-4f54-ad2c-bf1b123e5e79
GET /bookings/:id    -> 200; returned the created booking
PATCH /bookings/:id  -> 200; updated purpose to "Updated deployment verification"
DELETE /bookings/:id -> 204
GET /bookings/:id    -> 404; {"error":"Booking not found"}
```

The first default network request returned Cloudflare edge error `1042`; the same deployed URL over IPv4 returned `200` and all subsequent smoke tests passed. No booking created for the deployment test remains in the remote database.

## Final deployed Quality Gate checks

Base URL: `https://campus-equipment-booking-api.internship-api.workers.dev/api`  
Client: `curl.exe -4`

```text
POST /bookings invalid time -> 400; {"error":"startAt must be before endAt"}
POST /bookings overlapping  -> 409; {"error":"Booking time conflicts with an existing booking"}
GET /bookings/not-found      -> 404; {"error":"Booking not found"}
DELETE temporary baseline   -> 204
```

The temporary remote baseline booking ID was `aa2e2c8e-bead-487c-a3f6-5a29dbf8c84a`, and it was deleted after the checks.

## Base API response update

Date: 2026-10-06. Checks run by Codex using Node fetch with status assertions.
`npm.cmd run typecheck` passed. `npm.cmd run deploy` deployed Worker version
`944b30d9-ea02-482a-8cca-54f12914502a`.

The following checks passed both locally at `http://127.0.0.1:8788/api`
and against the deployed Base URL:

```text
GET /api             -> 200; exact message and endpoint paths verified
GET /equipment       -> 200; eq-1 and eq-2
GET /bookings        -> 200; [] before temporary bookings
POST /bookings       -> 201
GET /bookings/:id    -> 200
PATCH /bookings/:id  -> 200; purpose updated
POST invalid time    -> 400
POST invalid equipmentId -> 400
POST overlapping     -> 409
PATCH overlapping    -> 409
GET missing booking  -> 404
GET unknown route    -> 404; {"error":"Route not found"}
DELETE /bookings/:id -> 204; both temporary bookings removed
GET deleted booking  -> 404
```

The deployed `GET /api` response was:

```json
{"message":"Campus Equipment Booking API is running","endpoints":{"equipment":"/api/equipment","bookings":"/api/bookings"}}
```

The first local equipment request returned `500` because the local D1 tables
were absent. Applying the existing migration with `npm.cmd run db:migrate`
initialized the local database; the complete local rerun passed. No migration
or database schema was changed, and no remote migration was run for this update.
An initial Node command failed on PowerShell argument quoting before making
requests; the successful checks passed the script through stdin instead.
