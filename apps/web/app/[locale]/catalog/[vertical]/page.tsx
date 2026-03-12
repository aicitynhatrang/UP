import { getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { VERTICALS_CONFIG } from '@allcity/shared/constants/verticals'
import { VerticalContent } from './VerticalContent'

interface Props {
  params: { locale: string; vertical: string }
}

export async function generateStaticParams() {
  return VERTICALS_CONFIG.map(v => ({ vertical: v.slug }))
}

export async function generateMetadata({ params: { locale, vertical } }: Props): Promise<Metadata> {
  const v = VERTICALS_CONFIG.find(v => v.slug === vertical)
  if (!v) return {}
  const t = await getTranslations({ locale, namespace: 'verticals' })
  return { title: `${v.emoji} ${t(vertical)}` }
}

export default async function VerticalPage({ params: { locale, vertical } }: Props) {
  const v = VERTICALS_CONFIG.find(vc => vc.slug === vertical)
  if (!v) notFound()

  const t = await getTranslations({ locale, namespace: 'verticals' })

  return (
    <main className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <span className="text-4xl">{v.emoji}</span>
        <div>
          <h1 className="text-2xl font-bold">{t(vertical)}</h1>
        </div>
      </div>

      <VerticalContent vertical={vertical} />
    </main>
  )
}
