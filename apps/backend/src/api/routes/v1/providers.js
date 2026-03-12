import { z } from 'zod'
import { Errors } from '../../../utils/errors.js'
import { PAGINATION } from '@allcity/shared/constants/limits'

const SlugParam = z.object({ slug: z.string().min(1) })
const IdParam   = z.object({ id: z.string().uuid() })

const PaginationQuery = z.object({
  page:  z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(PAGINATION.DEFAULT_LIMIT),
})

/**
 * Provider CRUD + detail + services + reviews
 * Prefix: /api/v1/providers
 */
export function registerProviderRoutes(app, { supabaseAdmin, logger }) {

  // ── GET /providers/:slug — public detail ────────────────────────────────
  app.get('/providers/:slug', async (request, reply) => {
    const { slug } = SlugParam.parse(request.params)

    const { data, error } = await supabaseAdmin
      .from('providers')
      .select('*')
      .eq('slug', slug)
      .eq('status', 'active')
      .maybeSingle()

    if (error) throw Errors.internal(error.message)
    if (!data) throw Errors.notFound('Provider not found')

    return reply.send(data)
  })

  // ── GET /providers/:id/services ─────────────────────────────────────────
  app.get('/providers/:id/services', async (request, reply) => {
    const { id } = IdParam.parse(request.params)

    const { data, error } = await supabaseAdmin
      .from('provider_services')
      .select('*')
      .eq('provider_id', id)
      .eq('is_active', true)
      .order('sort_order')

    if (error) throw Errors.internal(error.message)
    return reply.send(data ?? [])
  })

  // ── GET /providers/:id/reviews ──────────────────────────────────────────
  app.get('/providers/:id/reviews', async (request, reply) => {
    const { id }            = IdParam.parse(request.params)
    const { page, limit }   = PaginationQuery.parse(request.query)
    const offset            = (page - 1) * limit

    const [countResult, dataResult] = await Promise.all([
      supabaseAdmin
        .from('reviews')
        .select('id', { count: 'exact', head: true })
        .eq('provider_id', id)
        .eq('is_published', true),
      supabaseAdmin
        .from('reviews')
        .select(`
          *,
          user:users!reviews_user_id_fkey(first_name, last_name, avatar_url, level)
        `)
        .eq('provider_id', id)
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1),
    ])

    if (dataResult.error) throw Errors.internal(dataResult.error.message)

    const total = countResult.count ?? 0
    return reply.send({
      data:       dataResult.data ?? [],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  })
}
