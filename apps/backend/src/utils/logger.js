import winston from 'winston'

const { combine, timestamp, json, colorize, simple } = winston.format

const isDev = process.env.NODE_ENV !== 'production'

export const logger = winston.createLogger({
  level: isDev ? 'debug' : 'info',
  format: combine(
    timestamp(),
    json()
  ),
  defaultMeta: { service: 'allcity-backend' },
  transports: [
    new winston.transports.Console({
      format: isDev ? combine(colorize(), simple()) : combine(timestamp(), json()),
    }),
  ],
})
