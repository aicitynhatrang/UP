import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'
import { GalleryContent } from './GalleryContent'

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'nav' })
  return { title: t('gallery') }
}

export default function GalleryPage() {
  return <GalleryContent />
}
