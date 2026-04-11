import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { ChatMessage } from '@/lib/types'
import { StreamingDots } from './StreamingDots'

// Ensure literal \n sequences and single newlines become real paragraph breaks
// so react-markdown renders them correctly.
function normaliseMarkdown(text: string): string {
  return text
    .replace(/\\n\\n/g, '\n\n')  // escaped double newline → real paragraph break
    .replace(/\\n/g, '\n')        // escaped single newline → real newline
    .replace(/\n{3,}/g, '\n\n')  // collapse excessive blank lines
}

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
        {message.streaming === true ? (
          <StreamingDots />
        ) : isUser ? (
          message.content
        ) : (
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
              strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
              ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
              li: ({ children }) => <li className="leading-relaxed">{children}</li>,
            }}
          >
            {normaliseMarkdown(message.content)}
          </ReactMarkdown>
        )}
      </div>
    </div>
  )
}
