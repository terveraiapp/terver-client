'use client'

import { useCallback, useRef, useState } from 'react'
import Link from 'next/link'
import { DropZone } from '@/components/upload/DropZone'
import { analyzeDocument } from '@/lib/api'

type FileStatus = 'waiting' | 'analysing' | 'done' | 'error'

interface QueuedFile {
  id: string
  file: File
  status: FileStatus
  sessionId?: string
  error?: string
}

function statusLabel(status: FileStatus) {
  if (status === 'waiting') return { text: 'Waiting…', color: 'text-[var(--color-text)]/40' }
  if (status === 'analysing') return { text: 'Analysing…', color: 'text-[var(--color-accent)]' }
  if (status === 'done') return { text: 'Done', color: 'text-green-600' }
  return { text: 'Failed', color: 'text-[var(--color-risk-high)]' }
}

export default function LandingPage() {
  const [queue, setQueue] = useState<QueuedFile[]>([])
  const processingRef = useRef(false)

  const updateFile = useCallback((id: string, patch: Partial<QueuedFile>) => {
    setQueue((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)))
  }, [])

  const runQueue = useCallback(async (items: QueuedFile[]) => {
    if (processingRef.current) return
    processingRef.current = true

    for (const item of items) {
      updateFile(item.id, { status: 'analysing' })
      try {
        for await (const event of analyzeDocument(item.file)) {
          if (event.type === 'session' && event.session_id) {
            updateFile(item.id, { status: 'done', sessionId: event.session_id })
            break
          }
          if (event.type === 'error') {
            updateFile(item.id, { status: 'error', error: event.message })
            break
          }
        }
      } catch (err) {
        updateFile(item.id, {
          status: 'error',
          error: err instanceof Error ? err.message : 'Upload failed.',
        })
      }
    }

    processingRef.current = false
  }, [updateFile])

  const handleFiles = useCallback((files: File[]) => {
    const newItems: QueuedFile[] = files.map((file) => ({
      id: crypto.randomUUID(),
      file,
      status: 'waiting',
    }))
    setQueue((prev) => {
      const updated = [...prev, ...newItems]
      // start processing only the newly added items
      runQueue(newItems)
      return updated
    })
  }, [runQueue])

  const hasQueue = queue.length > 0
  const allDone = hasQueue && queue.every((f) => f.status === 'done' || f.status === 'error')

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-xl flex flex-col items-center gap-10">
        {/* Logo + Wordmark */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-xl bg-[var(--color-primary)] flex items-center justify-center">
            <span className="text-[var(--color-accent)] text-2xl font-bold">T</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-[var(--color-primary)]">Terver</h1>
          <p className="text-base text-[var(--color-text)]/60 text-center">Know what you own.</p>
        </div>

        {/* Upload Zone */}
        <div className="w-full">
          <DropZone onFiles={handleFiles} disabled={hasQueue && !allDone} />
        </div>

        {/* Queue */}
        {hasQueue && (
          <div className="w-full flex flex-col gap-2">
            {queue.map((item) => {
              const { text, color } = statusLabel(item.status)
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] bg-white px-4 py-3 text-sm"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {item.status === 'analysing' && (
                      <span className="shrink-0 w-4 h-4 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
                    )}
                    <span className="truncate text-[var(--color-text)] font-medium">{item.file.name}</span>
                  </div>
                  <div className="shrink-0 flex items-center gap-3">
                    <span className={`text-xs ${color}`}>{text}</span>
                    {item.status === 'done' && item.sessionId && (
                      <Link
                        href={`/report/${item.sessionId}?file=${encodeURIComponent(item.file.name)}`}
                        target="_blank"
                        className="text-xs font-semibold text-[var(--color-primary)] hover:underline"
                      >
                        View Report →
                      </Link>
                    )}
                    {item.status === 'error' && item.error && (
                      <span className="text-xs text-[var(--color-risk-high)]">{item.error}</span>
                    )}
                  </div>
                </div>
              )
            })}

            {allDone && (
              <button
                onClick={() => setQueue([])}
                className="mt-1 text-xs text-[var(--color-text)]/40 hover:text-[var(--color-text)]/70 transition-colors text-center w-full"
              >
                Clear queue and upload more
              </button>
            )}
          </div>
        )}

        {/* Footer */}
        <p className="text-xs text-[var(--color-text)]/40 text-center max-w-sm">
          Upload any title deed, indenture, site plan, or conveyance.
          No account required. Your documents are analysed privately.
        </p>
      </div>
    </main>
  )
}
