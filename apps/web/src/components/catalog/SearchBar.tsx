'use client'

import { useTranslations } from 'next-intl'
import { useRef, type ChangeEvent } from 'react'

interface Props {
  value:    string
  onChange: (value: string) => void
}

export function SearchBar({ value, onChange }: Props) {
  const t   = useTranslations('common')
  const ref = useRef<HTMLInputElement>(null)

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    onChange(e.target.value)
  }

  return (
    <div className="relative">
      <svg
        className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none"
        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
      </svg>
      <input
        ref={ref}
        type="text"
        value={value}
        onChange={handleChange}
        placeholder={t('search')}
        className="input pl-11"
      />
      {value && (
        <button
          onClick={() => { onChange(''); ref.current?.focus() }}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  )
}
