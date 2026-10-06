# Campus Equipment Booking API

Small TypeScript/Hono API using a local Cloudflare D1 SQLite database.

## Setup

```bash
npm install
npm run db:migrate
npm run typecheck
npm run dev
```

The local API is available at `http://localhost:8787/api`.

## Cloudflare deployment

The deployed Base API URL is:

`https://campus-equipment-booking-api.internship-api.workers.dev/api`

Opening the Base API URL returns HTTP `200` with a running message and the equipment and bookings endpoint paths.

Remote resources:

- Worker: `campus-equipment-booking-api`
- D1 database: `booking-db`
- D1 database ID: `12cf3491-4cd5-40c8-b8a4-91c65d3fad4f`

The remote migration and seed data were applied with:

```bash
npm run db:migrate:remote
npm run deploy
```

The deployed API was verified for equipment lookup and booking list, create, read, update, delete, and deleted-resource lookup. See [TEST_EVIDENCE.md](TEST_EVIDENCE.md) for the recorded results.

## Quick test

In another terminal:

```bash
curl http://localhost:8787/api/equipment

curl -X POST http://localhost:8787/api/bookings \
  -H "Content-Type: application/json" \
  -d '{"equipmentId":"eq-1","borrowerName":"Somchai Jaidee","startAt":"2026-10-20T09:00:00.000Z","endAt":"2026-10-20T11:00:00.000Z","purpose":"Class presentation"}'

curl http://localhost:8787/api/bookings
```

See [API_CONTRACT.md](API_CONTRACT.md) for the complete endpoint contract and [SCHEMA.md](SCHEMA.md) for the data model.

## Design notes

- The migration seeds `eq-1` and `eq-2`.
- `PATCH` accepts any subset of booking fields and validates the merged record.
- Overlap checks run for both `POST` and `PATCH`; adjacent intervals are allowed.
- Valid timestamps are normalized to UTC before storage and overlap checks.
- Every SQL value from a request is passed through D1 parameter binding.
- The remote D1 `database_id` is configured in `wrangler.jsonc`; use `npm run db:migrate:remote` for future remote migrations.
