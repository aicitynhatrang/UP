import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'
import { CategoryGrid } from '@/components/catalog/CategoryGrid'
import { HomeClient } from './HomeClient'

interface Props {
  params: { locale: string }
}

export async function generateMetadata({ params: { locale } }: Props): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'home' })
  return { title: t('hero_title').replace('\n', ' ') }
}

export default async function HomePage({ params: { locale } }: Props) {
  const t = await getTranslations({ locale, namespace: 'home' })

  return (
    <main className="min-h-screen">
      {/* Hero */}
      <section className="flex flex-col items-center justify-center min-h-[60vh] px-4 py-16 text-center bg-gradient-to-b from-brand-500 to-brand-600 text-white">
        <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-4 whitespace-pre-line">
          {t('hero_title')}
        </h1>
        <p className="text-lg md:text-xl text-brand-100 max-w-xl mb-8">
          {t('hero_subtitle')}
        </p>
        <a
          href="#catalog"
          className="px-8 py-4 bg-white text-brand-600 font-semibold rounded-2xl shadow-lg hover:shadow-xl transition-all"
        >
          {t('hero_cta')}
        </a>
      </section>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-10">
        {/* Categories */}
        <section id="catalog">
          <h2 className="text-2xl font-bold mb-6">{t('categories')}</h2>
          <CategoryGrid />
        </section>

        {/* Client-side widgets */}
        <HomeClient />
      </div>
    </main>
  )
}
