import winston from 'winston'

const isDev = process.env.NODE_ENV !== 'production'

const winstonLogger = winston.createLogger({
  level:            isDev ? 'debug' : 'info',
  defaultMeta:      { service: 'allcity-bot' },
  format:           winston.format.combine(
    winston.format.timestamp(),
    isDev
      ? winston.format.combine(winston.format.colorize(), winston.format.simple())
      : winston.format.json(),
  ),
  transports: [new winston.transports.Console()],
})

// Pino-compatible wrapper: logger.info(meta, message) → winston.info(message, meta)
export const logger = {
  info:  (metaOrMsg, msg) => typeof metaOrMsg === 'string' ? winstonLogger.info(metaOrMsg) : winstonLogger.info(msg ?? '', metaOrMsg),
  warn:  (metaOrMsg, msg) => typeof metaOrMsg === 'string' ? winstonLogger.warn(metaOrMsg) : winstonLogger.warn(msg ?? '', metaOrMsg),
  error: (metaOrMsg, msg) => typeof metaOrMsg === 'string' ? winstonLogger.error(metaOrMsg) : winstonLogger.error(msg ?? '', metaOrMsg),
  debug: (metaOrMsg, msg) => typeof metaOrMsg === 'string' ? winstonLogger.debug(metaOrMsg) : winstonLogger.debug(msg ?? '', metaOrMsg),
}
