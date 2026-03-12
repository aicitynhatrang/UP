import { AppError } from '../../utils/errors.js'

const MAX_MESSAGES_PER_SESSION = 50
const SESSION_STALE_HOURS = 24

export class ChatbotService {
  #db
  #openai
  #aiConfig
  #logger

  constructor({ supabaseAdmin, openai, aiConfig, logger }) {
    this.#db = supabaseAdmin
    this.#openai = openai
    this.#aiConfig = aiConfig
    this.#logger = logger
  }

  /** Start or resume a chat session */
  async chat(userId, message, { lang = 'ru', lat, lng } = {}) {
    // Get or create session
    let session = await this.#getActiveSession(userId)
    if (!session) {
      session = await this.#createSession(userId, { lang, lat, lng })
    }

    const messages = session.messages ?? []
    messages.push({ role: 'user', content: message, at: new Date().toISOString() })

    // Trim old messages to keep context manageable
    const contextMessages = messages.slice(-20)

    // Build system prompt
    const systemPrompt = this.#buildSystemPrompt({ lang, lat, lng })

    const completion = await this.#openai.chat.completions.create({
      model: this.#aiConfig.textModel,
      temperature: 0.7,
      max_tokens: 1000,
      messages: [
        { role: 'system', content: systemPrompt },
        ...contextMessages.map((m) => ({ role: m.role, content: m.content })),
      ],
    })

    const reply = completion.choices[0]?.message?.content ?? ''
    messages.push({ role: 'assistant', content: reply, at: new Date().toISOString() })

    // Update session
    await this.#db
      .from('chat_sessions')
      .update({
        messages,
        last_msg_at: new Date().toISOString(),
        context: { ...session.context, lang, lat, lng },
      })
      .eq('id', session.id)

    return { sessionId: session.id, reply, messageCount: messages.length }
  }

  /** Get AI recommendations based on user context */
  async getRecommendations(userId, { query, mood, lat, lng, verticalSlug } = {}) {
    const prompt = [
      `You are an AI concierge for Nha Trang, Vietnam.`,
      `User query: "${query ?? 'Suggest something nearby'}"`,
      mood ? `Mood: ${mood}` : '',
      lat && lng ? `Location: ${lat}, ${lng}` : '',
      verticalSlug ? `Category: ${verticalSlug}` : '',
      ``,
      `Return a JSON array of up to 5 recommendations. Each object should have:`,
      `{ "category": "...", "suggestion": "...", "reason": "..." }`,
      `Only return the JSON array, no other text.`,
    ].filter(Boolean).join('\n')

    const completion = await this.#openai.chat.completions.create({
      model: this.#aiConfig.textModel,
      temperature: 0.8,
      messages: [
        { role: 'system', content: 'You are a local expert AI concierge for Nha Trang, Vietnam.' },
        { role: 'user', content: prompt },
      ],
    })

    const raw = completion.choices[0]?.message?.content ?? '[]'
    let recommendations
    try {
      recommendations = JSON.parse(raw)
    } catch {
      recommendations = [{ category: 'general', suggestion: raw, reason: 'AI response' }]
    }

    // Log recommendation
    await this.#db
      .from('ai_recommendations')
      .insert({
        user_id: userId,
        query,
        context: { mood, lat, lng, verticalSlug },
        recommendations,
        model: this.#aiConfig.textModel,
      })

    this.#logger.info({ userId, query, count: recommendations.length }, 'Chatbot: recommendations generated')
    return recommendations
  }

  /** Get chat history */
  async getHistory(userId, { page = 1, limit = 10 }) {
    const from = (page - 1) * limit

    const { data, count, error } = await this.#db
      .from('chat_sessions')
      .select('id, context, started_at, last_msg_at', { count: 'exact' })
      .eq('user_id', userId)
      .order('last_msg_at', { ascending: false })
      .range(from, from + limit - 1)

    if (error) throw new AppError('DB_ERROR', 500, error.message)
    return { data: data ?? [], total: count ?? 0 }
  }

  /** Get a specific session with messages */
  async getSession(sessionId, userId) {
    const { data, error } = await this.#db
      .from('chat_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .single()

    if (error || !data) throw new AppError('NOT_FOUND', 404)
    return data
  }

  // ── Private ─────────────────────────────────────────────────────────────────

  async #getActiveSession(userId) {
    const cutoff = new Date(Date.now() - SESSION_STALE_HOURS * 3600000).toISOString()

    const { data } = await this.#db
      .from('chat_sessions')
      .select('*')
      .eq('user_id', userId)
      .gte('last_msg_at', cutoff)
      .order('last_msg_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (data && (data.messages?.length ?? 0) >= MAX_MESSAGES_PER_SESSION) {
      return null // force new session
    }
    return data
  }

  async #createSession(userId, context) {
    const { data, error } = await this.#db
      .from('chat_sessions')
      .insert({
        user_id: userId,
        context,
        messages: [],
        model: this.#aiConfig.textModel,
      })
      .select()
      .single()

    if (error) throw new AppError('DB_ERROR', 500, error.message)
    return data
  }

  #buildSystemPrompt({ lang }) {
    const langMap = { ru: 'Russian', en: 'English', vi: 'Vietnamese' }
    const language = langMap[lang] ?? 'English'

    return [
      `You are AllCity AI — a friendly local concierge for Nha Trang, Vietnam.`,
      `Respond in ${language}.`,
      `You help users find restaurants, services, events, and activities.`,
      `Keep responses concise (under 200 words).`,
      `If you don't know something specific, suggest the user search on the platform.`,
      `Never make up business names or addresses.`,
    ].join('\n')
  }
}
