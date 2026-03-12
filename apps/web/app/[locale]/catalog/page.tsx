import { useTranslations } from 'next-intl'
import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'
import { CategoryGrid } from '@/components/catalog/CategoryGrid'
import { CatalogSearch } from './CatalogSearch'

interface Props {
  params: { locale: string }
}

export async function generateMetadata({ params: { locale } }: Props): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'catalog' })
  return { title: t('title') }
}

export default function CatalogPage() {
  const t = useTranslations('catalog')
  const th = useTranslations('home')

  return (
    <main className="max-w-6xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">{t('title')}</h1>

      {/* Search across all verticals */}
      <CatalogSearch />

      {/* Categories grid */}
      <section className="mt-8">
        <h2 className="text-lg font-semibold mb-4">{th('categories')}</h2>
        <CategoryGrid />
      </section>
    </main>
  )
}
