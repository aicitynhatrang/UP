import { z } from 'zod'
import { authenticate } from '../../middleware/authenticate.js'

const CreateEventBody = z.object({
  providerId:   z.string().uuid().optional(),
  title:        z.record(z.string()),
  description:  z.record(z.string()).optional(),
  category:     z.string().min(1).default('other'),
  locationName: z.string().max(200).optional(),
  lat:          z.number().min(-90).max(90).optional(),
  lng:          z.number().min(-180).max(180).optional(),
  startsAt:     z.string().datetime(),
  endsAt:       z.string().datetime(),
  isFree:       z.boolean().default(true),
  priceVnd:     z.number().int().positive().optional(),
  maxAttendees: z.number().int().positive().optional(),
  coverUrl:     z.string().url().optional(),
  tags:         z.array(z.string()).max(20).optional(),
  externalUrl:  z.string().url().optional(),
})

const RsvpBody = z.object({
  rsvpStatus: z.enum(['going', 'maybe', 'not_going']).default('going'),
})

const PaginationQuery = z.object({
  page:  z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export function registerEventRoutes(app, cradle) {
  const { eventService } = cradle

  /** POST /events — create event */
  app.post('/events', { preHandler: [authenticate] }, async (request) => {
    const body = CreateEventBody.parse(request.body)
    const result = await eventService.createEvent(request.user.id, body)
    return { ok: true, data: result }
  })

  /** GET /events — list upcoming events */
  app.get('/events', async (request) => {
    const { page, limit } = PaginationQuery.parse(request.query)
    const result = await eventService.listEvents({
      category: request.query.category,
      providerId: request.query.providerId,
      page,
      limit,
    })
    return { ok: true, ...result }
  })

  /** GET /events/mine — my created events */
  app.get('/events/mine', { preHandler: [authenticate] }, async (request) => {
    const { page, limit } = PaginationQuery.parse(request.query)
    const result = await eventService.getMyEvents(request.user.id, { page, limit })
    return { ok: true, ...result }
  })

  /** GET /events/:eventId — get event details */
  app.get('/events/:eventId', async (request) => {
    const result = await eventService.getEvent(request.params.eventId)
    return { ok: true, data: result }
  })

  /** PUT /events/:eventId — update event */
  app.put('/events/:eventId', { preHandler: [authenticate] }, async (request) => {
    const result = await eventService.updateEvent(request.params.eventId, request.user.id, request.body)
    return { ok: true, data: result }
  })

  /** POST /events/:eventId/rsvp — RSVP to event */
  app.post('/events/:eventId/rsvp', { preHandler: [authenticate] }, async (request) => {
    const { rsvpStatus } = RsvpBody.parse(request.body)
    const result = await eventService.rsvp(request.params.eventId, request.user.id, rsvpStatus)
    return { ok: true, data: result }
  })

  /** GET /events/:eventId/attendees — get attendees */
  app.get('/events/:eventId/attendees', async (request) => {
    const { page, limit } = PaginationQuery.parse(request.query)
    const result = await eventService.getAttendees(request.params.eventId, { page, limit })
    return { ok: true, ...result }
  })
}
