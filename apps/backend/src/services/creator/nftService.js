import { AppError } from '../../utils/errors.js'

/**
 * NFT Service — mints Creator badge NFTs on TON blockchain.
 * Phase 1: stores metadata + mock mint (no real TON calls).
 * Phase 2: integrate @ton/ton SDK for real minting.
 */
export class NftService {
  #db
  #logger
  #network

  constructor({ supabaseAdmin, logger }) {
    this.#db = supabaseAdmin
    this.#logger = logger
    this.#network = process.env.TON_NETWORK ?? 'testnet'
  }

  /** Mint a Creator NFT for a user */
  async mintCreatorNft(userId) {
    // Verify creator status
    const { data: user } = await this.#db
      .from('users')
      .select('id, is_creator, creator_nft_address, first_name, username')
      .eq('id', userId)
      .single()

    if (!user) throw new AppError('NOT_FOUND', 404)
    if (!user.is_creator) throw new AppError('NOT_CREATOR', 403, 'Creator status required')
    if (user.creator_nft_address) throw new AppError('ALREADY_MINTED', 409, 'NFT already minted')

    // Build metadata
    const metadata = {
      name: `AllCity Creator: ${user.first_name ?? user.username}`,
      description: 'Official AllCity Creator Badge — lifetime referral rights',
      image: `https://allcity.vn/nft/creator/${userId}.png`,
      attributes: [
        { trait_type: 'Role', value: 'Creator' },
        { trait_type: 'City', value: 'Nha Trang' },
        { trait_type: 'Network', value: this.#network },
      ],
    }

    // Store NFT record
    const { data: nft, error } = await this.#db
      .from('creator_nfts')
      .insert({
        user_id: userId,
        metadata,
        network: this.#network,
        status: 'pending',
      })
      .select()
      .single()

    if (error) throw new AppError('DB_ERROR', 500, error.message)

    // Mock mint — generate a placeholder address
    // In production, this calls TON SDK to deploy an NFT contract
    const mockAddress = `EQ${Buffer.from(userId.replace(/-/g, '').slice(0, 16)).toString('hex')}...${this.#network}`

    await this.#db
      .from('creator_nfts')
      .update({ address: mockAddress, status: 'minted', minted_at: new Date().toISOString() })
      .eq('id', nft.id)

    // Update user record
    await this.#db
      .from('users')
      .update({ creator_nft_address: mockAddress })
      .eq('id', userId)

    this.#logger.info({ userId, nftId: nft.id, address: mockAddress }, 'NFT: Creator badge minted')
    return { id: nft.id, address: mockAddress, metadata }
  }

  /** Get NFT details for a user */
  async getNft(userId) {
    const { data, error } = await this.#db
      .from('creator_nfts')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'minted')
      .maybeSingle()

    if (error) throw new AppError('DB_ERROR', 500, error.message)
    return data
  }

  /** List all minted NFTs (admin) */
  async listNfts({ page = 1, limit = 50 }) {
    const from = (page - 1) * limit

    const { data, count, error } = await this.#db
      .from('creator_nfts')
      .select('*, users(first_name, username)', { count: 'exact' })
      .eq('status', 'minted')
      .order('minted_at', { ascending: false })
      .range(from, from + limit - 1)

    if (error) throw new AppError('DB_ERROR', 500, error.message)
    return { data: data ?? [], total: count ?? 0 }
  }
}
