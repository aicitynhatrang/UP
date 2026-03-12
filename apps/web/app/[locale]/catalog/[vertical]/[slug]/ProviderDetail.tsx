'use client'

import { useTranslations } from 'next-intl'
import { useProvider, useProviderServices, useProviderReviews } from '@/lib/queries/providers'
import { useLocaleUtils } from '@/hooks/useLocaleUtils'
import { ProviderHeader } from '@/components/provider/ProviderHeader'
import { ProviderTabs } from '@/components/provider/ProviderTabs'

interface Props {
  slug: string
}

export function ProviderDetail({ slug }: Props) {
  const tc = useTranslations('common')
  const { data: provider, isLoading, error } = useProvider(slug)

  if (isLoading) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-6">
        <div className="animate-pulse space-y-4">
          <div className="aspect-[21/9] bg-gray-200 rounded-2xl" />
          <div className="h-8 bg-gray-200 rounded w-1/2" />
          <div className="h-4 bg-gray-100 rounded w-3/4" />
          <div className="h-4 bg-gray-100 rounded w-1/2" />
        </div>
      </main>
    )
  }

  if (error || !provider) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-16 text-center">
        <p className="text-5xl mb-4">😕</p>
        <p className="text-lg font-medium text-gray-700">{tc('no_results')}</p>
      </main>
    )
  }

  return (
    <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <ProviderHeader provider={provider} />
      <ProviderTabs provider={provider} />
    </main>
  )
}
