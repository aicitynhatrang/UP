'use client'

import { useTranslations } from 'next-intl'

const LEVEL_COLORS: Record<string, string> = {
  novice:     'bg-gray-100 text-gray-700',
  explorer:   'bg-blue-100 text-blue-700',
  local:      'bg-green-100 text-green-700',
  expert:     'bg-purple-100 text-purple-700',
  ambassador: 'bg-yellow-100 text-yellow-800',
  influencer: 'bg-pink-100 text-pink-700',
  creator:    'bg-orange-100 text-orange-700',
  architect:  'bg-red-100 text-red-700',
}

interface Props {
  level: string
}

export function LevelBadge({ level }: Props) {
  const t = useTranslations('levels')
  const colors = LEVEL_COLORS[level] ?? LEVEL_COLORS.novice

  return (
    <span className={`badge ${colors} text-xs mt-1`}>
      {t(level)}
    </span>
  )
}
