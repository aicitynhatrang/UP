export class AppError extends Error {
  /**
   * @param {string} code - machine-readable error code e.g. 'PROVIDER_NOT_FOUND'
   * @param {number} statusCode - HTTP status
   * @param {unknown} [details] - optional extra context
   */
  constructor(code, statusCode = 500, details = null) {
    super(code)
    this.name = 'AppError'
    this.code = code
    this.statusCode = statusCode
    this.details = details
  }
}

// Common error factories
export const Errors = {
  notFound:      (resource) => new AppError(`${resource}_NOT_FOUND`, 404),
  unauthorized:  ()         => new AppError('UNAUTHORIZED', 401),
  forbidden:     ()         => new AppError('FORBIDDEN', 403),
  conflict:      (resource) => new AppError(`${resource}_ALREADY_EXISTS`, 409),
  validation:    (details)  => new AppError('VALIDATION_ERROR', 400, details),
  rateLimited:   ()         => new AppError('RATE_LIMITED', 429),
  internal:      (msg)      => new AppError(msg ?? 'INTERNAL_ERROR', 500),
  badRequest:    (msg)      => new AppError(msg ?? 'BAD_REQUEST', 400),
}

/**
 * Fastify error handler — formats all errors into API contract shape
 */
export function buildErrorHandler(logger) {
  return function errorHandler(err, request, reply) {
    if (err instanceof AppError) {
      logger.warn('AppError', { code: err.code, statusCode: err.statusCode, path: request.url })
      return reply.status(err.statusCode).send({
        ok: false,
        error: { code: err.code, message: err.message, details: err.details },
      })
    }

    // Zod validation errors (from fastify-zod or manual parse)
    if (err.name === 'ZodError') {
      logger.warn('ValidationError', { issues: err.issues, path: request.url })
      return reply.status(400).send({
        ok: false,
        error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details: err.issues },
      })
    }

    // Fastify's built-in validation (ajv)
    if (err.validation) {
      return reply.status(400).send({
        ok: false,
        error: { code: 'VALIDATION_ERROR', message: err.message, details: err.validation },
      })
    }

    logger.error('UnhandledError', { error: err.message, stack: err.stack, path: request.url })
    return reply.status(500).send({
      ok: false,
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error', details: null },
    })
  }
}
