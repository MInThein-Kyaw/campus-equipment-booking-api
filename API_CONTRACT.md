# API Contract

Local Base URL: `http://localhost:8787/api`  
Deployed Base URL: `https://campus-equipment-booking-api.internship-api.workers.dev/api`

## API status

`GET /api` (the Base URL itself) returns `200` with:

```json
{"message":"Campus Equipment Booking API is running","endpoints":{"equipment":"/api/equipment","bookings":"/api/bookings"}}
```

## Equipment

`GET /equipment` returns `200` and an array of equipment records:

```json
[
  { "id": "eq-1", "name": "Projector A", "location": "Building 1" }
]
```

## Bookings

| Method | Path | Success | Description |
| --- | --- | ---: | --- |
| GET | `/bookings` | 200 | List bookings |
| GET | `/bookings/:id` | 200 | Get one booking |
| POST | `/bookings` | 201 | Create a booking |
| PATCH | `/bookings/:id` | 200 | Partially update a booking |
| DELETE | `/bookings/:id` | 204 | Delete a booking |

Booking JSON uses `equipmentId`, `borrowerName`, `startAt`, `endAt`, and `purpose`.
`startAt` and `endAt` must be valid ISO date-time strings, and `startAt` must be earlier.
Bookings for the same equipment cannot overlap. Endpoints use parameterized SQL.

All errors use `{ "error": "message" }` JSON. `400` means invalid input, `404` means
the booking or route does not exist, and `409` means the requested time conflicts with
an existing booking. An unknown equipment ID is treated as invalid input and returns `400`.
