'use client'

import { useEffect, useRef, useState } from 'react'
import type { ChatMessage } from '@/lib/types'
import { chatWithAmberlyn } from '@/lib/api'
import { MessageBubble } from './MessageBubble'

interface ChatPanelProps {
  sessionId: string
  documentContext: string
}

export function ChatPanel({ sessionId, documentContext }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'amberlyn',
      content:
        "I've reviewed your document. Ask me anything — I'm here to help you understand the risks and what to do next.",
    },
  ])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async () => {
    if (!input.trim() || streaming) return
    const userMessage = input.trim()
    setInput('')

    setMessages((prev) => [...prev, { role: 'user', content: userMessage }])
    setMessages((prev) => [...prev, { role: 'amberlyn', content: '', streaming: true }])
    setStreaming(true)

    try {
      let accumulated = ''
      for await (const event of chatWithAmberlyn(sessionId, userMessage, documentContext)) {
        if (event.type === 'token' && event.token) {
          accumulated += event.token
          setMessages((prev) => {
            const updated = [...prev]
            updated[updated.length - 1] = {
              role: 'amberlyn',
              content: accumulated,
              streaming: false,
            }
            return updated
          })
        }
      }
    } catch {
      setMessages((prev) => {
        const updated = [...prev]
        updated[updated.length - 1] = {
          role: 'amberlyn',
          content: 'Something went wrong. Please try again.',
          streaming: false,
        }
        return updated
      })
    } finally {
      setStreaming(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--color-border)] bg-white">
        <div className="w-8 h-8 rounded-full bg-[var(--color-primary)] flex items-center justify-center text-[var(--color-accent)] font-bold text-sm">
          A
        </div>
        <div>
          <p className="text-sm font-semibold text-[var(--color-text)]">Amberlyn</p>
          <p className="text-xs text-[var(--color-text)]/50">Property Intelligence · Terver</p>
        </div>
        <div className="ml-auto w-2 h-2 rounded-full bg-green-500" />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
        {messages.map((msg, i) => (
          <MessageBubble key={i} message={msg} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-[var(--color-border)] bg-white flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              void sendMessage()
            }
          }}
          placeholder="Ask Amberlyn about this document…"
          disabled={streaming}
          className="flex-1 text-sm px-4 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] placeholder:text-[var(--color-text)]/40 focus:outline-none focus:border-[var(--color-primary)] disabled:opacity-50"
        />
        <button
          onClick={() => void sendMessage()}
          disabled={streaming || !input.trim()}
          className="px-4 py-2.5 rounded-xl bg-[var(--color-primary)] text-white text-sm font-medium disabled:opacity-40 hover:opacity-90 transition-opacity"
        >
          Send
        </button>
      </div>
    </div>
  )
}
