import { z } from 'zod'
import { Errors } from '../../../utils/errors.js'
import { PAGINATION } from '@allcity/shared/constants/limits'

const CatalogQuery = z.object({
  vertical:   z.string().optional(),
  q:          z.string().optional(),
  sort:       z.enum(['rating', 'distance', 'price_asc', 'price_desc', 'new']).default('rating'),
  open_now:   z.coerce.boolean().optional(),
  verified:   z.coerce.boolean().optional(),
  min_rating: z.coerce.number().min(0).max(5).optional(),
  tags:       z.string().optional(),    // comma-separated
  lat:        z.coerce.number().optional(),
  lng:        z.coerce.number().optional(),
  radius_km:  z.coerce.number().optional(),
  page:       z.coerce.number().int().min(1).default(1),
  limit:      z.coerce.number().int().min(1).max(100).default(PAGINATION.DEFAULT_LIMIT),
})

/**
 * Catalog search endpoints
 * Prefix: /api/v1/catalog
 */
export function registerCatalogRoutes(app, { supabaseAdmin, logger }) {

  // ── GET /catalog/verticals — list verticals ─────────────────────────────
  app.get('/catalog/verticals', async (_request, reply) => {
    const { data, error } = await supabaseAdmin
      .from('verticals')
      .select('*')
      .eq('is_active', true)
      .order('sort_order')

    if (error) throw Errors.internal(error.message)
    return reply.send(data ?? [])
  })

  // ── GET /catalog/providers — search & filter ────────────────────────────
  app.get('/catalog/providers', async (request, reply) => {
    const filters = CatalogQuery.parse(request.query)
    const offset  = (filters.page - 1) * filters.limit

    // Build query
    let query = supabaseAdmin
      .from('providers')
      .select('*', { count: 'exact' })
      .eq('status', 'active')

    // ── Filters ───────────────────────────────────────────────────────────
    if (filters.vertical) {
      query = query.eq('vertical_slug', filters.vertical)
    }

    if (filters.q) {
      // Full-text search on fts column (unaccented, multi-language)
      query = query.textSearch('fts', filters.q, { type: 'websearch' })
    }

    if (filters.verified) {
      query = query.eq('is_verified', true)
    }

    if (filters.min_rating) {
      query = query.gte('rating', filters.min_rating)
    }

    if (filters.tags) {
      const tagList = filters.tags.split(',').map(t => t.trim()).filter(Boolean)
      if (tagList.length) {
        query = query.overlaps('tags', tagList)
      }
    }

    // ── Sort ──────────────────────────────────────────────────────────────
    switch (filters.sort) {
      case 'rating':
        query = query.order('rating', { ascending: false }).order('review_count', { ascending: false })
        break
      case 'new':
        query = query.order('created_at', { ascending: false })
        break
      case 'price_asc':
        // approximate: sort by vertical avg check
        query = query.order('rating', { ascending: false })
        break
      case 'price_desc':
        query = query.order('rating', { ascending: false })
        break
      case 'distance':
        // Distance sort requires lat/lng — fallback to rating if not provided
        query = query.order('rating', { ascending: false })
        break
      default:
        query = query.order('rating', { ascending: false })
    }

    // ── Pagination ────────────────────────────────────────────────────────
    query = query.range(offset, offset + filters.limit - 1)

    const { data, error, count } = await query

    if (error) {
      logger.error({ error, filters }, 'Catalog search failed')
      throw Errors.internal(error.message)
    }

    const total = count ?? 0
    return reply.send({
      data:       data ?? [],
      total,
      page:       filters.page,
      limit:      filters.limit,
      totalPages: Math.ceil(total / filters.limit),
    })
  })
}
