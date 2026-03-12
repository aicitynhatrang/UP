import { useTranslations } from 'next-intl'
import { getTranslations } from 'next-intl/server'
import { GamificationContent } from './GamificationContent'

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }) {
  const t = await getTranslations({ locale, namespace: 'gamification' })
  return { title: t('title') }
}

export default function GamificationPage() {
  const t = useTranslations('gamification')
  return (
    <main className="container mx-auto px-4 py-6 pb-24 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">{t('title')}</h1>
      <GamificationContent />
    </main>
  )
}
