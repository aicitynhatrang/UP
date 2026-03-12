'use client'

import { useProvider } from '@/lib/provider-context'
import { useTranslations } from 'next-intl'
import Image from 'next/image'
import { useState } from 'react'

export function GalleryContent() {
  const provider = useProvider()
  const t = useTranslations('site')
  const [selected, setSelected] = useState<string | null>(null)

  const photos = provider.photos ?? []

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-6">{t('gallery_title')}</h1>

      {photos.length === 0 ? (
        <p className="text-gray-500 text-center py-12">{t('no_photos')}</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {photos.map((url: string, i: number) => (
            <button
              key={i}
              onClick={() => setSelected(url)}
              className="aspect-square relative rounded-xl overflow-hidden group"
            >
              <Image
                src={url}
                alt={`${provider.name} photo ${i + 1}`}
                fill
                className="object-cover group-hover:scale-105 transition-transform"
              />
            </button>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {selected && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setSelected(null)}
        >
          <button
            className="absolute top-4 right-4 text-white/80 hover:text-white text-3xl z-10"
            onClick={() => setSelected(null)}
          >
            ×
          </button>
          <div className="relative max-w-4xl max-h-[85vh] w-full h-full">
            <Image
              src={selected}
              alt=""
              fill
              className="object-contain"
              onClick={e => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  )
}
