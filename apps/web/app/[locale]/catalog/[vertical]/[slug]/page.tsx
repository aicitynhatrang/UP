import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'
import { ProviderDetail } from './ProviderDetail'

interface Props {
  params: { locale: string; vertical: string; slug: string }
}

export async function generateMetadata({ params: { locale, slug } }: Props): Promise<Metadata> {
  // In production, fetch provider data server-side for SEO metadata
  return { title: slug.replace(/-/g, ' ') }
}

export default function ProviderPage({ params: { slug } }: Props) {
  return <ProviderDetail slug={slug} />
}
