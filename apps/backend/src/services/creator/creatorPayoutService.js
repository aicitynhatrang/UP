import { AppError } from '../../utils/errors.js'

const MIN_PAYOUT_VND = 1_150_000 // ~$50 USD equivalent

export class CreatorPayoutService {
  #db
  #logger

  constructor({ supabaseAdmin, logger }) {
    this.#db = supabaseAdmin
    this.#logger = logger
  }

  /** Request a payout */
  async requestPayout(creatorId, { method, details }) {
    // Verify creator status
    const { data: user } = await this.#db
      .from('users')
      .select('id, is_creator')
      .eq('id', creatorId)
      .single()

    if (!user?.is_creator) throw new AppError('NOT_CREATOR', 403, 'Creator status required')

    // Calculate available balance
    const available = await this.#getAvailableBalance(creatorId)
    if (available < MIN_PAYOUT_VND) {
      throw new AppError('BELOW_MIN_PAYOUT', 400, `Minimum payout: ${MIN_PAYOUT_VND} VND (available: ${available})`)
    }

    // Check no pending payout already
    const { data: pending } = await this.#db
      .from('creator_payouts')
      .select('id')
      .eq('creator_id', creatorId)
      .eq('status', 'pending')
      .maybeSingle()

    if (pending) throw new AppError('PAYOUT_PENDING', 409, 'A payout is already pending')

    const { data, error } = await this.#db
      .from('creator_payouts')
      .insert({
        creator_id: creatorId,
        amount_vnd: available,
        method,      // 'bank' | 'crypto' | 'wallet'
        details,     // { bank_name, account_number } or { wallet_address } etc.
        status: 'pending',
      })
      .select()
      .single()

    if (error) throw new AppError('DB_ERROR', 500, error.message)
    this.#logger.info({ payoutId: data.id, creatorId, amount: available, method }, 'CreatorPayout: requested')
    return data
  }

  /** Admin: approve a payout */
  async approvePayout(payoutId, adminId) {
    const { data: payout, error: fetchErr } = await this.#db
      .from('creator_payouts')
      .select('*')
      .eq('id', payoutId)
      .eq('status', 'pending')
      .single()

    if (fetchErr || !payout) throw new AppError('NOT_FOUND', 404, 'Payout not found or not pending')

    const { data, error } = await this.#db
      .from('creator_payouts')
      .update({
        status: 'approved',
        approved_by: adminId,
        approved_at: new Date().toISOString(),
      })
      .eq('id', payoutId)
      .select()
      .single()

    if (error) throw new AppError('DB_ERROR', 500, error.message)
    this.#logger.info({ payoutId, adminId }, 'CreatorPayout: approved')
    return data
  }

  /** Admin: mark payout as paid */
  async markPaid(payoutId, adminId, txRef) {
    const { data, error } = await this.#db
      .from('creator_payouts')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString(),
        tx_reference: txRef,
      })
      .eq('id', payoutId)
      .eq('status', 'approved')
      .select()
      .single()

    if (error || !data) throw new AppError('NOT_FOUND', 404, 'Payout not found or not approved')
    this.#logger.info({ payoutId, adminId, txRef }, 'CreatorPayout: paid')
    return data
  }

  /** Admin: reject a payout */
  async rejectPayout(payoutId, adminId, reason) {
    const { data, error } = await this.#db
      .from('creator_payouts')
      .update({
        status: 'rejected',
        reject_reason: reason,
        approved_by: adminId,
      })
      .eq('id', payoutId)
      .eq('status', 'pending')
      .select()
      .single()

    if (error || !data) throw new AppError('NOT_FOUND', 404, 'Payout not found or not pending')
    this.#logger.info({ payoutId, adminId, reason }, 'CreatorPayout: rejected')
    return data
  }

  /** List payouts for a creator */
  async listPayouts(creatorId, { page = 1, limit = 20 }) {
    const from = (page - 1) * limit

    const { data, count, error } = await this.#db
      .from('creator_payouts')
      .select('*', { count: 'exact' })
      .eq('creator_id', creatorId)
      .order('created_at', { ascending: false })
      .range(from, from + limit - 1)

    if (error) throw new AppError('DB_ERROR', 500, error.message)
    return { data: data ?? [], total: count ?? 0 }
  }

  /** Admin: list all pending payouts */
  async listPendingPayouts({ page = 1, limit = 50 }) {
    const from = (page - 1) * limit

    const { data, count, error } = await this.#db
      .from('creator_payouts')
      .select('*, users!creator_payouts_creator_id_fkey(first_name, username)', { count: 'exact' })
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .range(from, from + limit - 1)

    if (error) throw new AppError('DB_ERROR', 500, error.message)
    return { data: data ?? [], total: count ?? 0 }
  }

  // ── Private ─────────────────────────────────────────────────────────────────

  async #getAvailableBalance(creatorId) {
    // Sum of all referral earnings
    const { data: links } = await this.#db
      .from('blogger_referral_links')
      .select('total_earned_vnd')
      .eq('blogger_id', creatorId)

    const totalEarned = (links ?? []).reduce((s, l) => s + l.total_earned_vnd, 0)

    // Sum of all product sales earnings
    const { data: purchases } = await this.#db
      .from('creator_product_purchases')
      .select('creator_payout_vnd, creator_products!inner(creator_id)')
      .eq('creator_products.creator_id', creatorId)

    const totalProductEarned = (purchases ?? []).reduce((s, p) => s + p.creator_payout_vnd, 0)

    // Sum of paid/pending payouts
    const { data: payouts } = await this.#db
      .from('creator_payouts')
      .select('amount_vnd, status')
      .eq('creator_id', creatorId)
      .in('status', ['pending', 'approved', 'paid'])

    const totalWithdrawn = (payouts ?? []).reduce((s, p) => s + p.amount_vnd, 0)

    return totalEarned + totalProductEarned - totalWithdrawn
  }
}
