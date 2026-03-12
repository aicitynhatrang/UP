'use client'

import { useTranslations } from 'next-intl'
import { useClub77Status, useClub77Slots, useJoinClub77, type Club77Slot } from '@/lib/queries/gamification'
import { useAuthStore } from '@/store/authStore'

export function Club77Section() {
  const t = useTranslations('gamification')
  const token = useAuthStore((s) => s.token)
  const { data: status } = useClub77Status()
  const { data: slots } = useClub77Slots()
  const join = useJoinClub77()

  const tierColors: Record<string, string> = {
    bronze: 'from-amber-600 to-amber-800',
    silver: 'from-gray-400 to-gray-600',
    gold: 'from-yellow-400 to-yellow-600',
    platinum: 'from-indigo-400 to-indigo-600',
  }

  return (
    <div className="card">
      <h3 className="text-lg font-bold mb-1">Club 77</h3>
      <p className="text-sm text-gray-500 mb-4">{t('club77Desc')}</p>

      {status?.is_member && status.membership && (
        <div className={`p-4 rounded-xl bg-gradient-to-r ${tierColors[status.membership.tier] ?? 'from-gray-500 to-gray-700'} text-white mb-4`}>
          <div className="text-sm opacity-80">Your membership</div>
          <div className="text-xl font-bold capitalize">{status.membership.tier}</div>
          <div className="text-sm">Slot #{status.membership.slot_number}</div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {(slots as Club77Slot[] ?? []).map((slot) => (
          <div key={slot.tier} className="border rounded-xl p-3">
            <div className="font-bold capitalize mb-1">{slot.tier}</div>
            <div className="text-sm text-gray-500 mb-2">
              {slot.available}/{slot.total} {t('slotsLeft')}
            </div>
            <div className="w-full h-1.5 bg-gray-200 rounded-full mb-3">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${tierColors[slot.tier] ?? 'from-gray-400 to-gray-600'}`}
                style={{ width: `${(slot.taken / slot.total) * 100}%` }}
              />
            </div>
            {token && !status?.is_member && slot.available > 0 && (
              <button
                className="btn-primary w-full text-sm"
                disabled={join.isPending}
                onClick={() => join.mutate(slot.tier)}
              >
                {join.isPending ? '...' : t('joinClub')}
              </button>
            )}
            {slot.available === 0 && (
              <div className="text-center text-xs text-gray-400">{t('full')}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
