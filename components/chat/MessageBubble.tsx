import type { ChatMessage } from '@/lib/types'
import { StreamingDots } from './StreamingDots'

export function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser ? (
        <div className="w-7 h-7 rounded-full bg-[var(--color-primary)] flex items-center justify-center text-[var(--color-accent)] text-xs font-bold mr-2 mt-1 shrink-0">
          A
        </div>
      ) : null}
      <div
        className={[
          'max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
          isUser
            ? 'bg-[var(--color-primary)] text-white rounded-tr-sm'
            : 'bg-white border border-[var(--color-border)] text-[var(--color-text)] rounded-tl-sm',
        ].join(' ')}
      >
        {message.streaming === true ? <StreamingDots /> : message.content}
      </div>
    </div>
  )
}
