import { createHash } from 'node:crypto'
import { AppError } from '../../utils/errors.js'

export class ReceiptValidationService {
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

  /** Validate a receipt image for a checkin */
  async validateReceipt({ checkinId, userId, providerId, imageUrl }) {
    const imageHash = createHash('sha256').update(imageUrl).digest('hex')

    // Check for duplicate receipt
    const { data: existing } = await this.#db
      .from('receipt_validations')
      .select('id')
      .eq('image_hash', imageHash)
      .maybeSingle()

    if (existing) {
      throw new AppError('DUPLICATE_RECEIPT', 400, 'This receipt has already been submitted')
    }

    // Use GPT-4o-mini vision to analyze the receipt
    const visionResult = await this.#analyzeReceipt(imageUrl)

    // Check fraud signals
    const fraudSignals = this.#detectFraudSignals(visionResult)
    const isValid = visionResult.isReceipt && fraudSignals.length === 0

    // Store validation result
    const { data, error } = await this.#db
      .from('receipt_validations')
      .insert({
        checkin_id: checkinId,
        user_id: userId,
        provider_id: providerId,
        image_url: imageUrl,
        image_hash: imageHash,
        vision_result: visionResult,
        amount_detected: visionResult.totalAmount ?? null,
        is_valid: isValid,
        fraud_signals: fraudSignals,
      })
      .select()
      .single()

    if (error) throw new AppError('DB_ERROR', 500, error.message)

    this.#logger.info(
      { checkinId, userId, isValid, amount: visionResult.totalAmount, fraudSignals },
      'ReceiptValidation: processed',
    )

    return data
  }

  /** Get validation result for a checkin */
  async getValidation(checkinId) {
    const { data, error } = await this.#db
      .from('receipt_validations')
      .select('*')
      .eq('checkin_id', checkinId)
      .maybeSingle()

    if (error) throw new AppError('DB_ERROR', 500, error.message)
    return data
  }

  // ── Private ─────────────────────────────────────────────────────────────────

  async #analyzeReceipt(imageUrl) {
    const prompt = [
      'Analyze this receipt image. Return a JSON object with these fields:',
      '{ "isReceipt": true/false, "storeName": "...", "totalAmount": 123000, "currency": "VND",',
      '  "date": "YYYY-MM-DD", "items": [{"name": "...", "price": 50000}],',
      '  "confidence": 0.95, "language": "vi" }',
      'If this is not a receipt, set isReceipt to false and other fields to null.',
      'Only return valid JSON, no other text.',
    ].join('\n')

    const completion = await this.#openai.chat.completions.create({
      model: this.#aiConfig.visionModel,
      max_tokens: 500,
      messages: [
        {
          role: 'system',
          content: 'You are a receipt OCR system. Extract data from receipt images accurately.',
        },
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: imageUrl, detail: 'high' } },
            { type: 'text', text: prompt },
          ],
        },
      ],
    })

    const raw = completion.choices[0]?.message?.content ?? '{}'
    try {
      return JSON.parse(raw)
    } catch {
      return { isReceipt: false, confidence: 0, error: 'Failed to parse vision response' }
    }
  }

  #detectFraudSignals(visionResult) {
    const signals = []

    if (!visionResult.isReceipt) {
      signals.push({ type: 'NOT_RECEIPT', message: 'Image does not appear to be a receipt' })
    }

    if (visionResult.confidence && visionResult.confidence < 0.5) {
      signals.push({ type: 'LOW_CONFIDENCE', message: 'Low confidence in receipt analysis' })
    }

    if (visionResult.date) {
      const receiptDate = new Date(visionResult.date)
      const daysDiff = (Date.now() - receiptDate.getTime()) / 86400000
      if (daysDiff > 7) {
        signals.push({ type: 'OLD_RECEIPT', message: 'Receipt is more than 7 days old' })
      }
    }

    return signals
  }
}
