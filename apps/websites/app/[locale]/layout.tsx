import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import { locales, type Locale } from '@/i18n/config'
import { ProviderContextProvider } from '@/lib/provider-context'
import { SiteHeader } from '@/components/layout/SiteHeader'
import { SiteFooter } from '@/components/layout/SiteFooter'
import { fetchProvider } from '@/lib/queries/provider'
import '../globals.css'

const inter = Inter({ subsets: ['latin', 'cyrillic'], variable: '--font-inter' })

interface Props {
  children: React.ReactNode
  params: { locale: string }
}

function extractSlug(): string {
  const host = headers().get('host') ?? ''
  const baseDomain = process.env.WEBSITE_BASE_DOMAIN ?? 'allcity.vn'

  // subdomain routing: slug.allcity.vn
  if (host.includes(baseDomain)) {
    const slug = host.replace(`.${baseDomain}`, '').split(':')[0]
    if (slug && slug !== baseDomain.split('.')[0]) return slug
  }

  // fallback: ?slug=xxx (dev mode)
  return process.env.DEFAULT_PROVIDER_SLUG ?? 'demo'
}

export async function generateStaticParams() {
  return locales.map(locale => ({ locale }))
}

export async function generateMetadata({ params: { locale } }: Props): Promise<Metadata> {
  const slug = extractSlug()
  try {
    const { data: provider } = await fetchProvider(slug)
    return {
      title: { default: provider.name, template: `%s — ${provider.name}` },
      description: provider.description,
    }
  } catch {
    return { title: 'AllCity Business' }
  }
}

export default async function LocaleLayout({ children, params: { locale } }: Props) {
  if (!locales.includes(locale as Locale)) notFound()

  const messages = await getMessages()
  const slug = extractSlug()

  let provider: any
  try {
    const res = await fetchProvider(slug)
    provider = res.data
  } catch {
    notFound()
  }

  if (!provider?.website_enabled) notFound()

  return (
    <html lang={locale} className={inter.variable}>
      <body className="bg-surface text-gray-900 antialiased min-h-screen flex flex-col">
        <NextIntlClientProvider messages={messages}>
          <ProviderContextProvider provider={provider}>
            <SiteHeader />
            <main className="flex-1">{children}</main>
            <SiteFooter />
          </ProviderContextProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
