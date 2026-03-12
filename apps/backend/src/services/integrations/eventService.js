import { AppError } from '../../utils/errors.js'

export class EventService {
  #db
  #logger

  constructor({ supabaseAdmin, logger }) {
    this.#db = supabaseAdmin
    this.#logger = logger
  }

  /** Create a city event */
  async createEvent(creatorId, {
    providerId, title, description, category, locationName,
    lat, lng, startsAt, endsAt, isFree, priceVnd,
    maxAttendees, coverUrl, tags, externalUrl,
  }) {
    const { data, error } = await this.#db
      .from('city_events')
      .insert({
        creator_id: creatorId,
        provider_id: providerId ?? null,
        title,
        description: description ?? {},
        category: category ?? 'other',
        location_name: locationName,
        lat, lng,
        starts_at: startsAt,
        ends_at: endsAt,
        is_free: isFree ?? true,
        price_vnd: priceVnd ?? null,
        max_attendees: maxAttendees ?? null,
        cover_url: coverUrl ?? null,
        tags: tags ?? [],
        external_url: externalUrl ?? null,
      })
      .select()
      .single()

    if (error) throw new AppError('DB_ERROR', 500, error.message)
    this.#logger.info({ eventId: data.id, creatorId }, 'Event: created')
    return data
  }

  /** Update an event */
  async updateEvent(eventId, creatorId, updates) {
    const allowedFields = [
      'title', 'description', 'category', 'location_name',
      'lat', 'lng', 'starts_at', 'ends_at', 'is_free', 'price_vnd',
      'max_attendees', 'cover_url', 'tags', 'external_url', 'status',
    ]

    const filtered = {}
    for (const key of allowedFields) {
      if (updates[key] !== undefined) filtered[key] = updates[key]
    }

    const { data, error } = await this.#db
      .from('city_events')
      .update(filtered)
      .eq('id', eventId)
      .eq('creator_id', creatorId)
      .select()
      .single()

    if (error || !data) throw new AppError('NOT_FOUND', 404, 'Event not found or not yours')
    return data
  }

  /** Get single event with attendee count */
  async getEvent(eventId) {
    const { data, error } = await this.#db
      .from('city_events')
      .select('*, users!city_events_creator_id_fkey(first_name, username, avatar_url)')
      .eq('id', eventId)
      .single()

    if (error || !data) throw new AppError('NOT_FOUND', 404)
    return data
  }

  /** List upcoming events with filters */
  async listEvents({ category, providerId, page = 1, limit = 20 }) {
    const from = (page - 1) * limit
    let query = this.#db
      .from('city_events')
      .select('*, users!city_events_creator_id_fkey(first_name, username, avatar_url)', { count: 'exact' })
      .eq('status', 'published')
      .gte('ends_at', new Date().toISOString())

    if (category) query = query.eq('category', category)
    if (providerId) query = query.eq('provider_id', providerId)

    const { data, count, error } = await query
      .order('starts_at', { ascending: true })
      .range(from, from + limit - 1)

    if (error) throw new AppError('DB_ERROR', 500, error.message)
    return { data: data ?? [], total: count ?? 0 }
  }

  /** RSVP to an event */
  async rsvp(eventId, userId, rsvpStatus = 'going') {
    // Check capacity
    const { data: event } = await this.#db
      .from('city_events')
      .select('id, max_attendees, attendee_count')
      .eq('id', eventId)
      .single()

    if (!event) throw new AppError('NOT_FOUND', 404)
    if (rsvpStatus === 'going' && event.max_attendees && event.attendee_count >= event.max_attendees) {
      throw new AppError('EVENT_FULL', 400, 'Event is at capacity')
    }

    const { data, error } = await this.#db
      .from('event_attendees')
      .upsert(
        { event_id: eventId, user_id: userId, rsvp_status: rsvpStatus },
        { onConflict: 'event_id,user_id' },
      )
      .select()
      .single()

    if (error) throw new AppError('DB_ERROR', 500, error.message)

    // Update attendee_count
    const { count } = await this.#db
      .from('event_attendees')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .eq('rsvp_status', 'going')

    await this.#db
      .from('city_events')
      .update({ attendee_count: count ?? 0 })
      .eq('id', eventId)

    this.#logger.info({ eventId, userId, rsvpStatus }, 'Event: RSVP')
    return data
  }

  /** Get attendees for an event */
  async getAttendees(eventId, { page = 1, limit = 50 }) {
    const from = (page - 1) * limit

    const { data, count, error } = await this.#db
      .from('event_attendees')
      .select('*, users!event_attendees_user_id_fkey(first_name, username, avatar_url)', { count: 'exact' })
      .eq('event_id', eventId)
      .eq('rsvp_status', 'going')
      .order('created_at', { ascending: false })
      .range(from, from + limit - 1)

    if (error) throw new AppError('DB_ERROR', 500, error.message)
    return { data: data ?? [], total: count ?? 0 }
  }

  /** Get events created by a user */
  async getMyEvents(creatorId, { page = 1, limit = 20 }) {
    const from = (page - 1) * limit

    const { data, count, error } = await this.#db
      .from('city_events')
      .select('*', { count: 'exact' })
      .eq('creator_id', creatorId)
      .order('starts_at', { ascending: false })
      .range(from, from + limit - 1)

    if (error) throw new AppError('DB_ERROR', 500, error.message)
    return { data: data ?? [], total: count ?? 0 }
  }
}
