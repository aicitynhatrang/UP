import { MYSTERY_SHOPPER } from '@allcity/shared/constants/limits'
import { Errors } from '../../utils/errors.js'

/**
 * Mystery shopper — anonymous quality audits assigned to qualified users.
 */
export class MysteryShopperService {
  constructor({ supabaseAdmin, pointsService, logger }) {
    this.db     = supabaseAdmin
    this.points = pointsService
    this.log    = logger
  }

  async listAvailable(userId) {
    const { data } = await this.db
      .from('mystery_shopper_tasks')
      .select(`
        *,
        provider:providers!mystery_shopper_tasks_provider_id_fkey(id, name, slug)
      `)
      .eq('status', 'open')
      .is('assigned_to', null)
      .gte('deadline', new Date().toISOString())
      .order('deadline', { ascending: true })
      .limit(20)

    return data ?? []
  }

  async claim(taskId, userId) {
    const { data: task } = await this.db
      .from('mystery_shopper_tasks')
      .select('*')
      .eq('id', taskId)
      .eq('status', 'open')
      .is('assigned_to', null)
      .single()

    if (!task) throw Errors.notFound('Task not available')

    // Check user qualifies (min level: expert)
    const { data: user } = await this.db
      .from('users')
      .select('level')
      .eq('id', userId)
      .single()

    const qualifiedLevels = ['expert', 'ambassador', 'influencer', 'creator', 'architect']
    if (!user || !qualifiedLevels.includes(user.level)) {
      throw Errors.forbidden('Minimum level: Expert required for mystery shopping')
    }

    // Check max concurrent tasks
    const { count } = await this.db
      .from('mystery_shopper_tasks')
      .select('id', { count: 'exact', head: true })
      .eq('assigned_to', userId)
      .in('status', ['assigned', 'submitted'])

    if ((count ?? 0) >= MYSTERY_SHOPPER.MAX_CONCURRENT) {
      throw Errors.conflict('Too many active mystery shopper tasks')
    }

    await this.db
      .from('mystery_shopper_tasks')
      .update({ assigned_to: userId, status: 'assigned' })
      .eq('id', taskId)

    this.log.info({ taskId, userId }, 'MysteryShopperService: task claimed')
    return { ok: true }
  }

  async submit(taskId, userId, submission) {
    const { data: task } = await this.db
      .from('mystery_shopper_tasks')
      .select('*')
      .eq('id', taskId)
      .eq('assigned_to', userId)
      .eq('status', 'assigned')
      .single()

    if (!task) throw Errors.notFound('Task not assigned to you')

    await this.db
      .from('mystery_shopper_tasks')
      .update({
        status:       'submitted',
        submission,
        submitted_at: new Date().toISOString(),
      })
      .eq('id', taskId)

    this.log.info({ taskId, userId }, 'MysteryShopperService: submitted')
    return { ok: true }
  }

  async approve(taskId, reviewerId) {
    const { data: task } = await this.db
      .from('mystery_shopper_tasks')
      .select('*')
      .eq('id', taskId)
      .eq('status', 'submitted')
      .single()

    if (!task) throw Errors.notFound('Task not found')

    await this.db
      .from('mystery_shopper_tasks')
      .update({ status: 'approved', reviewed_at: new Date().toISOString() })
      .eq('id', taskId)

    // Award points and VND
    await this.points.award(task.assigned_to, 'mystery_shopper', task.reward_points)

    this.log.info({ taskId, userId: task.assigned_to }, 'MysteryShopperService: approved')
    return { ok: true }
  }
}
