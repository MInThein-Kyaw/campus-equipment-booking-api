import { Hono } from 'hono'
import type { Context } from 'hono'

type Bindings = {
  DB: D1Database
}

type BookingRow = {
  id: string
  equipment_id: string
  borrower_name: string
  start_at: string
  end_at: string
  purpose: string
}

type BookingInput = {
  equipmentId?: unknown
  borrowerName?: unknown
  startAt?: unknown
  endAt?: unknown
  purpose?: unknown
}

const app = new Hono<{ Bindings: Bindings }>()
const api = new Hono<{ Bindings: Bindings }>()

function jsonError(c: Context<{ Bindings: Bindings }>, status: 400 | 404 | 409, message: string) {
  return c.json({ error: message }, status)
}

function bookingResponse(row: BookingRow) {
  return {
    id: row.id,
    equipmentId: row.equipment_id,
    borrowerName: row.borrower_name,
    startAt: row.start_at,
    endAt: row.end_at,
    purpose: row.purpose
  }
}

function validateBookingInput(input: BookingInput) {
  const fields = ['equipmentId', 'borrowerName', 'startAt', 'endAt', 'purpose'] as const
  for (const field of fields) {
    if (typeof input[field] !== 'string' || input[field].trim() === '') {
      return `${field} is required and must be a non-empty string`
    }
  }

  const startAt = new Date(input.startAt as string)
  const endAt = new Date(input.endAt as string)
  if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
    return 'startAt and endAt must be valid ISO date-time strings'
  }
  if (startAt >= endAt) {
    return 'startAt must be before endAt'
  }
  return null
}

function normaliseDateTimes(input: BookingInput) {
  return {
    startAt: new Date(input.startAt as string).toISOString(),
    endAt: new Date(input.endAt as string).toISOString()
  }
}

async function parseBookingBody(c: Context<{ Bindings: Bindings }>): Promise<BookingInput | Response> {
  try {
    const body = await c.req.json()
    if (body === null || typeof body !== 'object' || Array.isArray(body)) {
      return c.json({ error: 'Request body must be a JSON object' }, 400)
    }
    return body as BookingInput
  } catch {
    return c.json({ error: 'Request body must be valid JSON' }, 400)
  }
}

async function equipmentExists(db: D1Database, equipmentId: string) {
  const row = await db.prepare('SELECT id FROM equipment WHERE id = ?').bind(equipmentId).first()
  return row !== null
}

async function hasOverlap(db: D1Database, equipmentId: string, startAt: string, endAt: string, ignoredId?: string) {
  let query = `
    SELECT id FROM bookings
    WHERE equipment_id = ?
      AND start_at < ?
      AND end_at > ?`
  const values: string[] = [equipmentId, endAt, startAt]

  if (ignoredId) {
    query += ' AND id != ?'
    values.push(ignoredId)
  }

  const row = await db.prepare(query).bind(...values).first()
  return row !== null
}

api.get('/', (c) => c.json({
  message: 'Campus Equipment Booking API is running',
  endpoints: {
    equipment: '/api/equipment',
    bookings: '/api/bookings'
  }
}))

api.get('/equipment', async (c) => {
  const result = await c.env.DB.prepare(
    'SELECT id, name, location FROM equipment ORDER BY id'
  ).all()
  return c.json(result.results)
})

api.get('/bookings', async (c) => {
  const result = await c.env.DB.prepare(`
    SELECT id, equipment_id, borrower_name, start_at, end_at, purpose
    FROM bookings
    ORDER BY start_at, id
  `).all<BookingRow>()
  return c.json(result.results.map(bookingResponse))
})

api.get('/bookings/:id', async (c) => {
  const row = await c.env.DB.prepare(`
    SELECT id, equipment_id, borrower_name, start_at, end_at, purpose
    FROM bookings WHERE id = ?
  `).bind(c.req.param('id')).first<BookingRow>()

  if (!row) return jsonError(c, 404, 'Booking not found')
  return c.json(bookingResponse(row))
})

api.post('/bookings', async (c) => {
  const input = await parseBookingBody(c)
  if (input instanceof Response) return input

  const validationError = validateBookingInput(input)
  if (validationError) return jsonError(c, 400, validationError)

  const equipmentId = input.equipmentId as string
  const { startAt, endAt } = normaliseDateTimes(input)
  if (!(await equipmentExists(c.env.DB, equipmentId))) {
    return jsonError(c, 400, 'equipmentId does not exist')
  }
  if (await hasOverlap(c.env.DB, equipmentId, startAt, endAt)) {
    return jsonError(c, 409, 'Booking time conflicts with an existing booking')
  }

  const id = crypto.randomUUID()
  await c.env.DB.prepare(`
    INSERT INTO bookings (id, equipment_id, borrower_name, start_at, end_at, purpose)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(id, equipmentId, input.borrowerName, startAt, endAt, input.purpose).run()

  const row = await c.env.DB.prepare(`
    SELECT id, equipment_id, borrower_name, start_at, end_at, purpose
    FROM bookings WHERE id = ?
  `).bind(id).first<BookingRow>()
  return c.json(bookingResponse(row!), 201)
})

api.patch('/bookings/:id', async (c) => {
  const id = c.req.param('id')
  const existing = await c.env.DB.prepare(`
    SELECT id, equipment_id, borrower_name, start_at, end_at, purpose
    FROM bookings WHERE id = ?
  `).bind(id).first<BookingRow>()
  if (!existing) return jsonError(c, 404, 'Booking not found')

  const input = await parseBookingBody(c)
  if (input instanceof Response) return input
  const merged: BookingInput = {
    equipmentId: input.equipmentId ?? existing.equipment_id,
    borrowerName: input.borrowerName ?? existing.borrower_name,
    startAt: input.startAt ?? existing.start_at,
    endAt: input.endAt ?? existing.end_at,
    purpose: input.purpose ?? existing.purpose
  }
  const validationError = validateBookingInput(merged)
  if (validationError) return jsonError(c, 400, validationError)

  const equipmentId = merged.equipmentId as string
  const { startAt, endAt } = normaliseDateTimes(merged)
  if (!(await equipmentExists(c.env.DB, equipmentId))) {
    return jsonError(c, 400, 'equipmentId does not exist')
  }
  if (await hasOverlap(c.env.DB, equipmentId, startAt, endAt, id)) {
    return jsonError(c, 409, 'Booking time conflicts with an existing booking')
  }

  await c.env.DB.prepare(`
    UPDATE bookings
    SET equipment_id = ?, borrower_name = ?, start_at = ?, end_at = ?, purpose = ?
    WHERE id = ?
  `).bind(equipmentId, merged.borrowerName, startAt, endAt, merged.purpose, id).run()

  const row = await c.env.DB.prepare(`
    SELECT id, equipment_id, borrower_name, start_at, end_at, purpose
    FROM bookings WHERE id = ?
  `).bind(id).first<BookingRow>()
  return c.json(bookingResponse(row!))
})

api.delete('/bookings/:id', async (c) => {
  const result = await c.env.DB.prepare('DELETE FROM bookings WHERE id = ?').bind(c.req.param('id')).run()
  if (!result.meta.changes) return jsonError(c, 404, 'Booking not found')
  return c.body(null, 204)
})

app.route('/api', api)
app.notFound((c) => c.json({ error: 'Route not found' }, 404))
app.onError((error, c) => {
  console.error(error)
  return c.json({ error: 'Internal server error' }, 500)
})

export default app
