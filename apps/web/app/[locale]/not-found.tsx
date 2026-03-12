import { useTranslations } from 'next-intl'
import Link from 'next/link'

export default function NotFound() {
  const t = useTranslations('errors')
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
      <p className="text-8xl font-bold text-brand-500 mb-4">404</p>
      <h1 className="text-2xl font-bold mb-2">{t('not_found')}</h1>
      <p className="text-gray-500 mb-8">{t('not_found_hint')}</p>
      <Link
        href="/"
        className="px-6 py-3 bg-brand-500 text-white rounded-xl font-semibold hover:bg-brand-600 transition-colors"
      >
        {t('go_home')}
      </Link>
    </main>
  )
}
