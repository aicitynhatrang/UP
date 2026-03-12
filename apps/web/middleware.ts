import createMiddleware from 'next-intl/middleware'
import { locales, defaultLocale } from './src/i18n/config'

export default createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'always',
})

export const config = {
  // Match all pathnames except static files, api routes, and _next
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
}
