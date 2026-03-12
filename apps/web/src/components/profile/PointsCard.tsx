'use client'

import { useTranslations } from 'next-intl'
import { USER_LEVELS } from '@allcity/shared/constants/statuses'

interface Props {
  balance:  number
  lifetime: number
  level:    string
}

export function PointsCard({ balance, lifetime, level }: Props) {
  const t = useTranslations('gamification')
  const tl = useTranslations('levels')

  const currentLevel = USER_LEVELS.find(l => l.slug === level)
  const nextLevel    = USER_LEVELS.find(l => l.minPoints > lifetime)
  const progress     = nextLevel
    ? ((lifetime - (currentLevel?.minPoints ?? 0)) / (nextLevel.minPoints - (currentLevel?.minPoints ?? 0))) * 100
    : 100

  return (
    <div className="card p-5 bg-gradient-to-br from-brand-500 to-brand-600 text-white">
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-brand-100 text-xs font-medium uppercase tracking-wider">{t('balance')}</p>
          <p className="text-3xl font-bold">{balance.toLocaleString()}</p>
        </div>
        <div className="text-right">
          <p className="text-brand-100 text-xs font-medium uppercase tracking-wider">{t('lifetime')}</p>
          <p className="text-lg font-semibold">{lifetime.toLocaleString()}</p>
        </div>
      </div>

      {/* Level progress */}
      <div className="mt-2">
        <div className="flex justify-between text-xs text-brand-100 mb-1">
          <span>{tl(level)}</span>
          {nextLevel && <span>{tl(nextLevel.slug)}</span>}
        </div>
        <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
          <div
            className="h-full bg-white rounded-full transition-all duration-500"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
        {nextLevel && (
          <p className="text-xs text-brand-100 mt-1">
            {t('next_level_at', { points: nextLevel.minPoints - lifetime })}
          </p>
        )}
      </div>
    </div>
  )
}
