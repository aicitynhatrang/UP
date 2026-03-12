'use client'

import { useState, useRef, useEffect } from 'react'
import { useAiChat, useAiRecommend, useChatHistory } from '@/lib/queries/ai'
import { useTranslations } from 'next-intl'
import { useAuthStore } from '@/store/authStore'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export default function AiChatPage() {
  const t = useTranslations('ai')
  const token = useAuthStore(s => s.accessToken)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [tab, setTab] = useState<'chat' | 'recommend'>('chat')
  const bottomRef = useRef<HTMLDivElement>(null)

  const chat = useAiChat()
  const recommend = useAiRecommend()

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (!token) {
    return (
      <main className="max-w-3xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">{t('title')}</h1>
        <p className="text-gray-500">{t('login_required')}</p>
      </main>
    )
  }

  const handleSend = async () => {
    const text = input.trim()
    if (!text) return
    setInput('')

    const userMsg: Message = { role: 'user', content: text }
    setMessages(prev => [...prev, userMsg])

    if (tab === 'chat') {
      chat.mutate(
        { message: text },
        {
          onSuccess: (data: any) => {
            setMessages(prev => [...prev, { role: 'assistant', content: data.data?.reply || data.reply || '' }])
          },
        },
      )
    } else {
      recommend.mutate(
        { query: text },
        {
          onSuccess: (data: any) => {
            const recs = data.data?.recommendations || data.recommendations || []
            const text = recs.map((r: any) => `**${r.name}** — ${r.reason}`).join('\n\n')
            setMessages(prev => [...prev, { role: 'assistant', content: text || t('no_recommendations') }])
          },
        },
      )
    }
  }

  const isPending = chat.isPending || recommend.isPending

  return (
    <main className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="border-b px-4 py-3">
        <h1 className="text-lg font-bold mb-2">{t('title')}</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setTab('chat')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              tab === 'chat' ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {t('chat_mode')}
          </button>
          <button
            onClick={() => setTab('recommend')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              tab === 'recommend' ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {t('recommend_mode')}
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 py-12">
            <p className="text-4xl mb-4">🤖</p>
            <p>{tab === 'chat' ? t('chat_hint') : t('recommend_hint')}</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-brand-500 text-white rounded-br-md'
                  : 'bg-gray-100 text-gray-800 rounded-bl-md'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {isPending && (
          <div className="flex justify-start">
            <div className="bg-gray-100 px-4 py-3 rounded-2xl rounded-bl-md text-sm text-gray-400">
              {t('thinking')}...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t px-4 py-3">
        <form
          onSubmit={e => { e.preventDefault(); handleSend() }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={t('input_placeholder')}
            disabled={isPending}
            className="flex-1 px-4 py-3 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isPending || !input.trim()}
            className="px-6 py-3 bg-brand-500 text-white font-medium rounded-xl hover:bg-brand-600 transition-colors disabled:opacity-50"
          >
            {t('send')}
          </button>
        </form>
      </div>
    </main>
  )
}
