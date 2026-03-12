'use client'

import { useState, useRef, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useOrderMessages, useSendMessage } from '@/lib/queries/orders'
import { useAuthStore } from '@/store/authStore'

interface Props {
  orderId: string
}

export function OrderChat({ orderId }: Props) {
  const tc          = useTranslations('common')
  const to          = useTranslations('order')
  const userId      = useAuthStore(s => s.user?.id)
  const { data: messages, isLoading } = useOrderMessages(orderId)
  const send        = useSendMessage(orderId)
  const [text, setText] = useState('')
  const bottomRef   = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function handleSend() {
    const content = text.trim()
    if (!content) return
    send.mutate({ content })
    setText('')
  }

  return (
    <div className="card flex flex-col h-[400px]">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 font-medium text-sm">
        {to('chat')}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {isLoading && (
          <p className="text-gray-400 text-sm text-center">{tc('loading')}</p>
        )}
        {(messages as any[])?.map((msg: any) => {
          const isMine = msg.sender_id === userId
          return (
            <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm ${
                isMine
                  ? 'bg-brand-500 text-white rounded-br-md'
                  : 'bg-gray-100 text-gray-900 rounded-bl-md'
              }`}>
                {msg.type === 'image' && msg.media_url && (
                  <img src={msg.media_url} alt="" className="rounded-xl mb-1 max-w-full" />
                )}
                {msg.content && <p>{msg.content}</p>}
                <p className={`text-[10px] mt-0.5 ${isMine ? 'text-white/60' : 'text-gray-400'}`}>
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-3 py-2 border-t border-gray-100 flex gap-2">
        <input
          type="text"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder={tc('write')}
          className="input py-2 text-sm flex-1"
        />
        <button
          onClick={handleSend}
          disabled={!text.trim() || send.isPending}
          className="btn-primary text-sm py-2 px-4"
        >
          {tc('submit')}
        </button>
      </div>
    </div>
  )
}
