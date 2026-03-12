'use client'

import { useTranslations } from 'next-intl'

interface Props {
  hours: Record<string, { open: string; close: string }>
}

export function WorkingHours({ hours }: Props) {
  const tp = useTranslations('provider')

  const entries = Object.entries(hours)
  if (!entries.length) return null

  // Simple check if currently open (rough — uses local browser time)
  const now      = new Date()
  const nowMins  = now.getHours() * 60 + now.getMinutes()

  return (
    <div className="space-y-1.5">
      {entries.map(([day, { open, close }]) => {
        const [oh, om] = open.split(':').map(Number)
        const [ch, cm] = close.split(':').map(Number)
        const openMins  = oh * 60 + om
        const closeMins = ch * 60 + cm
        const isOpen    = nowMins >= openMins && nowMins < closeMins

        return (
          <div key={day} className="flex items-center justify-between text-sm">
            <span className="text-gray-700 font-medium">{day}</span>
            <div className="flex items-center gap-2">
              <span className="text-gray-600">{open} – {close}</span>
              <span className={`w-2 h-2 rounded-full ${isOpen ? 'bg-green-500' : 'bg-gray-300'}`} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
