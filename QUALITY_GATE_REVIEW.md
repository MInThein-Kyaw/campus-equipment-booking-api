# Quality Gate Review

Review date: 2026-10-06  
Local review Base URL: `http://127.0.0.1:8787/api`  
Final deployed Base URL: `https://campus-equipment-booking-api.internship-api.workers.dev/api`

| Quality Gate area | Finding | Action taken | Evidence |
| --- | --- | --- | --- |
| Reliability | A valid JSON `null` request body reached field validation and caused a `500` instead of a client error. | Added an object check in the request parser. Null, arrays, and primitive JSON values now return JSON `400` responses. | Before the fix: `POST /bookings` with `null` returned `500` and `{ "error": "Internal server error" }`. After the fix: it returned `400` and `{ "error": "Request body must be a JSON object" }`. |
| Accuracy | Overlap detection compared timestamp text. A booking using a different valid ISO offset represented an overlapping UTC interval but was accepted with `201`. | Normalize validated `startAt` and `endAt` values with `toISOString()` before overlap checks and database writes. | Before the fix, `2026-10-26T11:30:00+02:00` to `12:30+02:00` was accepted as `201` against `10:00Z` to `11:00Z`. After the fix, the same overlap test returned `409`. |
| Reasoning / You Own It | The saved evidence covered a conflicting `POST` but did not demonstrate the required conflicting `PATCH`, or explain why an update must exclude its own booking from the overlap query. | Ran a focused update-conflict test and documented the self-exclusion reasoning in this review and `TEST_EVIDENCE.md`. | Two `eq-2` bookings were created for 09:00–11:00 and 12:00–14:00. Updating the second to 10:00–12:30 returned `409` with the expected JSON error; both temporary records were then deleted. |

## Final decision

**READY**, subject to explaining the implementation, the two code fixes, and the update-overlap reasoning during ownership questions.

Two older local test bookings were preserved during testing. The final test booking was deleted and its subsequent lookup returned `404`.

## Final deployed checks

The deployed API returned the required error responses:

- Invalid time range: `400`, `{ "error": "startAt must be before endAt" }`
- Overlapping booking: `409`, `{ "error": "Booking time conflicts with an existing booking" }`
- Missing booking: `404`, `{ "error": "Booking not found" }`

The temporary remote baseline booking was deleted with `204` after testing.