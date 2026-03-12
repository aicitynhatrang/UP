import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12

/**
 * AES-256-GCM encryption for PII (phones, emails).
 * ENCRYPTION_KEY must be a 32-byte hex string (64 hex chars).
 */
export class EncryptionService {
  constructor({ securityConfig }) {
    this.key = Buffer.from(securityConfig.encryptionKey, 'hex')
    if (this.key.length !== 32) {
      throw new Error('ENCRYPTION_KEY must be 32 bytes (64 hex chars)')
    }
  }

  /**
   * Encrypt plaintext → "<iv_hex>:<tag_hex>:<ciphertext_hex>"
   */
  encrypt(plaintext) {
    if (!plaintext) return null
    const iv     = randomBytes(IV_LENGTH)
    const cipher = createCipheriv(ALGORITHM, this.key, iv)
    const enc    = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
    const tag    = cipher.getAuthTag()
    return `${iv.toString('hex')}:${tag.toString('hex')}:${enc.toString('hex')}`
  }

  /**
   * Decrypt "<iv_hex>:<tag_hex>:<ciphertext_hex>" → plaintext
   */
  decrypt(encrypted) {
    if (!encrypted) return null
    const [ivHex, tagHex, dataHex] = encrypted.split(':')
    if (!ivHex || !tagHex || !dataHex) throw new Error('Invalid encrypted format')
    const iv       = Buffer.from(ivHex,  'hex')
    const tag      = Buffer.from(tagHex, 'hex')
    const data     = Buffer.from(dataHex,'hex')
    const decipher = createDecipheriv(ALGORITHM, this.key, iv)
    decipher.setAuthTag(tag)
    return decipher.update(data) + decipher.final('utf8')
  }
}
