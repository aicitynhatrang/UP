'use client'

import { useTranslations, useLocale } from 'next-intl'
import { getLocalized } from '@/lib/utils'
import { useClaimMysteryTask, type MysteryTask } from '@/lib/queries/gamification'

interface Props {
  task: MysteryTask
}

export function MysteryTaskCard({ task }: Props) {
  const t = useTranslations('gamification')
  const locale = useLocale()
  const claim = useClaimMysteryTask()

  const statusColors: Record<string, string> = {
    available: 'bg-green-100 text-green-700',
    claimed: 'bg-blue-100 text-blue-700',
    submitted: 'bg-yellow-100 text-yellow-700',
    approved: 'bg-emerald-100 text-emerald-700',
    rejected: 'bg-red-100 text-red-700',
  }

  return (
    <div className="card">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h4 className="font-bold">
            {getLocalized(task.provider_name, locale)}
          </h4>
          <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[task.status] ?? ''}`}>
            {t(`mysteryStatus_${task.status}`)}
          </span>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-orange-600">
            +{task.reward_points}
          </div>
          {task.reward_bonus > 0 && (
            <div className="text-xs text-green-600">
              +{task.reward_bonus} bonus
            </div>
          )}
        </div>
      </div>

      <p className="text-sm text-gray-600 mb-4">
        {getLocalized(task.description, locale)}
      </p>

      {task.status === 'available' && (
        <button
          className="btn-primary w-full"
          disabled={claim.isPending}
          onClick={() => claim.mutate(task.id)}
        >
          {claim.isPending ? '...' : t('claimTask')}
        </button>
      )}
    </div>
  )
}
