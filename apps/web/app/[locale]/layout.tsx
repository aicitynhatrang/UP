import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Script from 'next/script'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages, getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { locales, type Locale } from '@/i18n/config'
import { QueryProvider } from '@/components/providers/QueryProvider'
import { AuthProvider } from '@/components/providers/AuthProvider'
import { Header } from '@/components/layout/Header'
import { BottomNav } from '@/components/layout/BottomNav'
import '../globals.css'

export const dynamic = 'force-dynamic'

const inter = Inter({ subsets: ['latin', 'cyrillic'], variable: '--font-inter' })

interface Props {
  children: React.ReactNode
  params: { locale: string }
}

export async function generateStaticParams() {
  return locales.map(locale => ({ locale }))
}

export async function generateMetadata({ params: { locale } }: Props): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'common' })
  return {
    title:       { default: t('app_name'), template: `%s — ${t('app_name')}` },
    description: t('tagline'),
    metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'https://allcity.vn'),
    openGraph: {
      siteName: t('app_name'),
      locale,
    },
  }
}

export default async function LocaleLayout({ children, params: { locale } }: Props) {
  if (!locales.includes(locale as Locale)) notFound()

  const messages = await getMessages()

  return (
    <html lang={locale} className={inter.variable}>
      <body className="bg-surface text-gray-900 antialiased">
        <Script
          src="https://telegram.org/js/telegram-web-app.js"
          strategy="afterInteractive"
        />
        <NextIntlClientProvider messages={messages}>
          <QueryProvider>
            <AuthProvider>
              <Header />
              <div className="pb-16 md:pb-0">
                {children}
              </div>
              <BottomNav />
            </AuthProvider>
          </QueryProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
