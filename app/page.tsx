'use client'

import { useCallback, useRef, useState } from 'react'
import Link from 'next/link'
import { DropZone } from '@/components/upload/DropZone'
import { analyzeDocument, analyzeCase } from '@/lib/api'
import { uploadStore } from '@/lib/upload-store'

type FileStatus = 'waiting' | 'analysing' | 'done' | 'error'
type Intent = 'separate' | 'case'

interface QueuedFile {
  id: string
  file: File
  status: FileStatus
  sessionId?: string
  error?: string
}

function statusLabel(status: FileStatus) {
  if (status === 'waiting')   return { text: 'Uploading…',  color: 'text-[var(--color-text)]/40' }
  if (status === 'analysing') return { text: 'Analysing…',  color: 'text-[var(--color-accent)]' }
  if (status === 'done')      return { text: 'Done',        color: 'text-green-600' }
  return                             { text: 'Failed',      color: 'text-[var(--color-risk-high)]' }
}

export default function LandingPage() {
  const [queue, setQueue]           = useState<QueuedFile[]>([])
  const [pendingFiles, setPending]  = useState<File[] | null>(null) // awaiting intent choice
  const processingRef               = useRef(false)

  const updateFile = useCallback((id: string, patch: Partial<QueuedFile>) => {
    setQueue(prev => prev.map(f => f.id === id ? { ...f, ...patch } : f))
  }, [])

  const removeFile = useCallback((id: string) => {
    setQueue(prev => prev.filter(f => f.id !== id))
  }, [])

  /* ── Run files separately (existing behaviour) ── */
  const runSeparate = useCallback(async (items: QueuedFile[]) => {
    if (processingRef.current) return
    processingRef.current = true
    for (const item of items) {
      updateFile(item.id, { status: 'analysing' })
      uploadStore.pendingFile = item.file
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

  /* ── Run files as one case ── */
  const runCase = useCallback(async (items: QueuedFile[]) => {
    if (processingRef.current) return
    processingRef.current = true

    // Mark all as analysing at once
    items.forEach(item => updateFile(item.id, { status: 'analysing' }))

    try {
      const files = items.map(i => i.file)
      for await (const event of analyzeCase(files)) {
        if (event.type === 'session' && event.session_id) {
          // All files share the same case session — mark all done, same report link
          items.forEach(item =>
            updateFile(item.id, { status: 'done', sessionId: event.session_id })
          )
          break
        }
        if (event.type === 'error') {
          items.forEach(item =>
            updateFile(item.id, { status: 'error', error: event.message })
          )
          break
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Case analysis failed.'
      items.forEach(item => updateFile(item.id, { status: 'error', error: msg }))
    }

    processingRef.current = false
  }, [updateFile])

  /* ── Intent decision ── */
  const chooseIntent = useCallback((intent: Intent) => {
    if (!pendingFiles) return
    const newItems: QueuedFile[] = pendingFiles.map(file => ({
      id: crypto.randomUUID(),
      file,
      status: 'waiting' as FileStatus,
    }))
    setPending(null)
    setQueue(prev => {
      const updated = [...prev, ...newItems]
      if (intent === 'case') {
        runCase(newItems)
      } else {
        runSeparate(newItems)
      }
      return updated
    })
  }, [pendingFiles, runCase, runSeparate])

  /* ── DropZone handler ── */
  const handleFiles = useCallback((files: File[]) => {
    if (files.length === 1) {
      // Single file — skip intent dialog
      const item: QueuedFile = { id: crypto.randomUUID(), file: files[0], status: 'waiting' }
      setQueue(prev => [...prev, item])
      uploadStore.pendingFile = files[0]
      runSeparate([item])
    } else {
      setPending(files)
    }
  }, [runSeparate])

  const hasQueue = queue.length > 0
  const allDone  = hasQueue && queue.every(f => f.status === 'done' || f.status === 'error')
  const isBusy   = hasQueue && !allDone

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-xl flex flex-col items-center gap-10">

        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-xl bg-[var(--color-primary)] flex items-center justify-center">
            <span className="text-[var(--color-accent)] text-2xl font-bold">T</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-[var(--color-primary)]">Terver</h1>
          <p className="text-base text-[var(--color-text)]/60 text-center">Know what you own.</p>
        </div>

        {/* Drop Zone */}
        <div className="w-full">
          <DropZone onFiles={handleFiles} disabled={isBusy || !!pendingFiles} />
        </div>

        {/* Intent dialog — shown when 2+ files dropped */}
        {pendingFiles && (
          <div className="w-full rounded-2xl border border-[var(--color-border)] bg-white p-5 flex flex-col gap-4">
            <div>
              <p className="text-sm font-semibold text-[var(--color-primary)]">
                {pendingFiles.length} documents selected
              </p>
              <p className="text-xs text-[var(--color-text)]/50 mt-0.5">
                How would you like to analyse them?
              </p>
            </div>

            <ul className="flex flex-col gap-1">
              {pendingFiles.map((f, i) => (
                <li key={i} className="text-xs text-[var(--color-text)]/60 truncate">
                  📄 {f.name}
                </li>
              ))}
            </ul>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => chooseIntent('case')}
                className="flex flex-col gap-1 rounded-xl border-2 border-[var(--color-primary)] bg-[var(--color-primary)] text-white px-4 py-3 text-left hover:opacity-90 transition-opacity"
              >
                <span className="text-sm font-semibold">One Case</span>
                <span className="text-xs opacity-70">Cross-reference all documents together — catches contradictions between them</span>
              </button>
              <button
                onClick={() => chooseIntent('separate')}
                className="flex flex-col gap-1 rounded-xl border-2 border-[var(--color-border)] px-4 py-3 text-left hover:border-[var(--color-primary)] transition-colors"
              >
                <span className="text-sm font-semibold text-[var(--color-primary)]">Separately</span>
                <span className="text-xs text-[var(--color-text)]/50">Individual report per document — use for unrelated files</span>
              </button>
            </div>

            <button
              onClick={() => setPending(null)}
              className="text-xs text-[var(--color-text)]/40 hover:text-[var(--color-text)]/60 transition-colors text-center"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Queue */}
        {hasQueue && (
          <div className="w-full flex flex-col gap-2">
            {queue.map((item, idx) => {
              const { text, color } = statusLabel(item.status)
              const canRemove = item.status !== 'analysing'
              // For case mode: all items share same sessionId — only show "View Case Report" on first done
              const isFirstDone = item.status === 'done' &&
                queue.filter(f => f.sessionId === item.sessionId)[0]?.id === item.id

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
                    {item.status === 'done' && item.sessionId && isFirstDone && (
                      <Link
                        href={`/report/${item.sessionId}?file=${encodeURIComponent(item.file.name)}`}
                        target="_blank"
                        className="text-xs font-semibold text-[var(--color-primary)] hover:underline whitespace-nowrap"
                      >
                        View Report →
                      </Link>
                    )}
                    {item.status === 'error' && item.error && (
                      <span className="text-xs text-[var(--color-risk-high)]">{item.error}</span>
                    )}
                    {canRemove && (
                      <button
                        onClick={() => removeFile(item.id)}
                        aria-label="Remove file"
                        className="w-5 h-5 rounded-full bg-[var(--color-text)]/10 hover:bg-[var(--color-text)]/20 flex items-center justify-center transition-colors"
                      >
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                          <path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
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
