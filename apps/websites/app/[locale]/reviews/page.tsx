import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'
import { ReviewsContent } from './ReviewsContent'

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'nav' })
  return { title: t('reviews') }
}

export default function ReviewsPage() {
  return <ReviewsContent />
}
