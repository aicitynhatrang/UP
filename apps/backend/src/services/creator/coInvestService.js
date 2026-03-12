import { AppError } from '../../utils/errors.js'

export class CoInvestService {
  #db
  #logger

  constructor({ supabaseAdmin, logger }) {
    this.#db = supabaseAdmin
    this.#logger = logger
  }

  /** List open rounds with optional filters */
  async listRounds({ page = 1, limit = 20, status = 'open' }) {
    const from = (page - 1) * limit

    let query = this.#db
      .from('co_invest_rounds')
      .select('*, providers!inner(name, slug)', { count: 'exact' })

    if (status) query = query.eq('status', status)

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(from, from + limit - 1)

    if (error) throw new AppError('DB_ERROR', error.message, 500)
    return { data, total: count }
  }

  /** Get single round with stakes */
  async getRound(roundId) {
    const { data, error } = await this.#db
      .from('co_invest_rounds')
      .select('*, providers(name, slug), co_invest_stakes(id, investor_id, amount_vnd, created_at)')
      .eq('id', roundId)
      .single()

    if (error || !data) throw new AppError('NOT_FOUND', 'Round not found', 404)
    return data
  }

  /** Create a new co-invest round */
  async createRound(creatorId, payload) {
    const { data, error } = await this.#db
      .from('co_invest_rounds')
      .insert({ ...payload, creator_id: creatorId })
      .select()
      .single()

    if (error) throw new AppError('DB_ERROR', error.message, 500)
    this.#logger.info({ roundId: data.id, creatorId }, 'CoInvest: round created')
    return data
  }

  /** Invest in a round */
  async invest(roundId, investorId, amountVnd) {
    // Fetch round
    const { data: round, error: roundErr } = await this.#db
      .from('co_invest_rounds')
      .select('*')
      .eq('id', roundId)
      .single()

    if (roundErr || !round) throw new AppError('NOT_FOUND', 'Round not found', 404)
    if (round.status !== 'open') throw new AppError('ROUND_CLOSED', 'Round is not open', 400)
    if (new Date(round.deadline) < new Date()) throw new AppError('ROUND_EXPIRED', 'Round deadline passed', 400)
    if (amountVnd < round.min_investment_vnd) throw new AppError('BELOW_MIN', `Minimum investment: ${round.min_investment_vnd}`, 400)
    if (round.max_investment_vnd && amountVnd > round.max_investment_vnd) throw new AppError('ABOVE_MAX', `Maximum investment: ${round.max_investment_vnd}`, 400)

    const remaining = round.target_amount_vnd - round.raised_amount_vnd
    if (amountVnd > remaining) throw new AppError('EXCEEDS_TARGET', `Only ${remaining} VND remaining`, 400)

    // Upsert stake
    const { data: existing } = await this.#db
      .from('co_invest_stakes')
      .select('id, amount_vnd')
      .eq('round_id', roundId)
      .eq('investor_id', investorId)
      .maybeSingle()

    let stake
    if (existing) {
      const newAmount = existing.amount_vnd + amountVnd
      if (round.max_investment_vnd && newAmount > round.max_investment_vnd) {
        throw new AppError('ABOVE_MAX', 'Total investment exceeds max', 400)
      }
      const { data, error } = await this.#db
        .from('co_invest_stakes')
        .update({ amount_vnd: newAmount })
        .eq('id', existing.id)
        .select()
        .single()
      if (error) throw new AppError('DB_ERROR', error.message, 500)
      stake = data
    } else {
      const { data, error } = await this.#db
        .from('co_invest_stakes')
        .insert({ round_id: roundId, investor_id: investorId, amount_vnd: amountVnd })
        .select()
        .single()
      if (error) throw new AppError('DB_ERROR', error.message, 500)
      stake = data
    }

    // Update raised amount
    const newRaised = round.raised_amount_vnd + amountVnd
    const updates = { raised_amount_vnd: newRaised }
    if (newRaised >= round.target_amount_vnd) {
      updates.status = 'funded'
      updates.funded_at = new Date().toISOString()
    }

    await this.#db
      .from('co_invest_rounds')
      .update(updates)
      .eq('id', roundId)

    this.#logger.info({ roundId, investorId, amountVnd, newRaised }, 'CoInvest: investment placed')
    return stake
  }

  /** Vote on a round (community due diligence) */
  async vote(roundId, voterId, vote, reason) {
    const { data, error } = await this.#db
      .from('co_invest_votes')
      .upsert(
        { round_id: roundId, voter_id: voterId, vote, reason },
        { onConflict: 'round_id,voter_id' },
      )
      .select()
      .single()

    if (error) throw new AppError('DB_ERROR', error.message, 500)
    return data
  }

  /** Get votes summary for a round */
  async getVotes(roundId) {
    const { data, error } = await this.#db
      .from('co_invest_votes')
      .select('*')
      .eq('round_id', roundId)
      .order('created_at', { ascending: false })

    if (error) throw new AppError('DB_ERROR', error.message, 500)

    const approve = data.filter((v) => v.vote === 'approve').length
    const reject = data.filter((v) => v.vote === 'reject').length

    return { votes: data, summary: { approve, reject, total: data.length } }
  }
}
