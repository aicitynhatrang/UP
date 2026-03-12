import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'
import { ServicesContent } from './ServicesContent'

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'nav' })
  return { title: t('services') }
}

export default function ServicesPage() {
  return <ServicesContent />
}
