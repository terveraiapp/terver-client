'use client'

import { useCallback, useRef, useState } from 'react'
import Image from 'next/image'
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
  caseId?: string   // set for all files that belong to the same case batch
  error?: string
}

function statusLabel(status: FileStatus) {
  if (status === 'waiting')   return { text: 'Uploading…', color: 'text-[var(--color-text)]/40' }
  if (status === 'analysing') return { text: 'Analysing…', color: 'text-[var(--color-accent)]' }
  if (status === 'done')      return { text: 'Done',       color: 'text-green-600' }
  return                             { text: 'Failed',     color: 'text-[var(--color-risk-high)]' }
}

/* ─── Liquid-glass intent modal ─── */
function IntentModal({
  files,
  onChoose,
  onCancel,
}: {
  files: File[]
  onChoose: (intent: Intent) => void
  onCancel: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(8px)' }}
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md rounded-3xl p-6 flex flex-col gap-5 shadow-2xl"
        style={{
          background: 'rgba(255,255,255,0.72)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          border: '1px solid rgba(255,255,255,0.5)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div>
          <p className="text-lg font-bold text-[var(--color-primary)]">
            {files.length} documents selected
          </p>
          <p className="text-sm text-[var(--color-text)]/55 mt-0.5">
            How would you like to analyse them?
          </p>
        </div>

        {/* File list */}
        <ul className="flex flex-col gap-1.5 max-h-36 overflow-y-auto">
          {files.map((f, i) => (
            <li key={i} className="flex items-center gap-2 text-sm text-[var(--color-text)]/65 truncate">
              <span className="text-base shrink-0">📄</span>
              <span className="truncate">{f.name}</span>
            </li>
          ))}
        </ul>

        {/* Choices */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => onChoose('case')}
            className="flex flex-col gap-1.5 rounded-2xl px-4 py-4 text-left transition-all active:scale-95"
            style={{ background: 'var(--color-primary)' }}
          >
            <span className="text-sm font-bold text-white">One Case</span>
            <span className="text-xs text-white/65 leading-snug">
              Cross-reference all documents together — surfaces contradictions between them
            </span>
          </button>
          <button
            onClick={() => onChoose('separate')}
            className="flex flex-col gap-1.5 rounded-2xl px-4 py-4 text-left border-2 border-[var(--color-border)] hover:border-[var(--color-primary)]/40 transition-colors active:scale-95 bg-white/60"
          >
            <span className="text-sm font-bold text-[var(--color-primary)]">Separately</span>
            <span className="text-xs text-[var(--color-text)]/50 leading-snug">
              Individual report per document — for unrelated files
            </span>
          </button>
        </div>

        <button
          onClick={onCancel}
          className="text-xs text-[var(--color-text)]/40 hover:text-[var(--color-text)]/60 transition-colors text-center"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

/* ─── Queue groups ─── */
function groupQueue(queue: QueuedFile[]) {
  // Returns: list of { caseId | null, items }
  const groups: { groupKey: string | null; items: QueuedFile[] }[] = []
  const seen = new Set<string>()

  for (const item of queue) {
    const key = item.caseId ?? item.id
    if (!seen.has(key)) {
      seen.add(key)
      groups.push({
        groupKey: item.caseId ?? null,
        items: queue.filter(f => (item.caseId ? f.caseId === item.caseId : f.id === item.id)),
      })
    }
  }
  return groups
}

export default function LandingPage() {
  const [queue, setQueue]          = useState<QueuedFile[]>([])
  const [pendingFiles, setPending] = useState<File[] | null>(null)
  const processingRef              = useRef(false)

  const updateFile = useCallback((id: string, patch: Partial<QueuedFile>) => {
    setQueue(prev => prev.map(f => f.id === id ? { ...f, ...patch } : f))
  }, [])

  const removeFile = useCallback((id: string) => {
    setQueue(prev => prev.filter(f => f.id !== id))
  }, [])

  const removeCaseGroup = useCallback((caseId: string) => {
    setQueue(prev => prev.filter(f => f.caseId !== caseId))
  }, [])

  /* ── Separate ── */
  const runSeparate = useCallback(async (items: QueuedFile[]) => {
    if (processingRef.current) return
    processingRef.current = true
    for (const item of items) {
      updateFile(item.id, { status: 'analysing' })
      try {
        for await (const event of analyzeDocument(item.file)) {
          if (event.type === 'session' && event.session_id) {
            uploadStore.set(event.session_id, { files: [item.file], isCase: false })
            updateFile(item.id, { status: 'done', sessionId: event.session_id })
            break
          }
          if (event.type === 'error') {
            updateFile(item.id, { status: 'error', error: event.message })
            break
          }
        }
      } catch (err) {
        updateFile(item.id, { status: 'error', error: err instanceof Error ? err.message : 'Upload failed.' })
      }
    }
    processingRef.current = false
  }, [updateFile])

  /* ── Case ── */
  const runCase = useCallback(async (items: QueuedFile[]) => {
    if (processingRef.current) return
    processingRef.current = true
    items.forEach(item => updateFile(item.id, { status: 'analysing' }))
    try {
      for await (const event of analyzeCase(items.map(i => i.file))) {
        if (event.type === 'session' && event.session_id) {
          uploadStore.set(event.session_id, { files: items.map(i => i.file), isCase: true })
          items.forEach(item => updateFile(item.id, { status: 'done', sessionId: event.session_id }))
          break
        }
        if (event.type === 'error') {
          items.forEach(item => updateFile(item.id, { status: 'error', error: event.message }))
          break
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Case analysis failed.'
      items.forEach(item => updateFile(item.id, { status: 'error', error: msg }))
    }
    processingRef.current = false
  }, [updateFile])

  /* ── Intent chosen ── */
  const chooseIntent = useCallback((intent: Intent) => {
    if (!pendingFiles) return
    const batchCaseId = intent === 'case' ? crypto.randomUUID() : undefined
    const newItems: QueuedFile[] = pendingFiles.map(file => ({
      id: crypto.randomUUID(),
      file,
      status: 'waiting' as FileStatus,
      caseId: batchCaseId,
    }))
    setPending(null)
    setQueue(prev => {
      if (intent === 'case') runCase(newItems)
      else runSeparate(newItems)
      return [...prev, ...newItems]
    })
  }, [pendingFiles, runCase, runSeparate])

  /* ── Drop ── */
  const handleFiles = useCallback((files: File[]) => {
    if (files.length === 1) {
      const item: QueuedFile = { id: crypto.randomUUID(), file: files[0], status: 'waiting' }
      setQueue(prev => [...prev, item])
      runSeparate([item])
    } else {
      setPending(files)
    }
  }, [runSeparate])

  const hasQueue = queue.length > 0
  const allDone  = hasQueue && queue.every(f => f.status === 'done' || f.status === 'error')
  const isBusy   = hasQueue && !allDone
  const groups   = groupQueue(queue)

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-xl flex flex-col items-center gap-10">

        {/* Logo */}
        <div className="flex flex-col items-center gap-2">
          <div className="w-24 h-24 rounded-full overflow-hidden flex items-center justify-center bg-white shrink-0 shadow-sm">
            <Image
              src="/terver-logo.png"
              alt="Terver"
              width={96}
              height={96}
              className="w-full h-full object-cover object-center"
              priority
            />
          </div>
          <p className="text-base text-[var(--color-text)]/60 text-center">Know what you own.</p>
        </div>

        {/* Drop Zone */}
        <div className="w-full">
          <DropZone onFiles={handleFiles} disabled={isBusy || !!pendingFiles} />
        </div>

        {/* Queue — grouped */}
        {hasQueue && (
          <div className="w-full flex flex-col gap-4">
            {groups.map(({ groupKey, items }) => {
              const isCase     = !!groupKey
              const caseSessionId = items[0]?.sessionId
              const caseAllDone   = items.every(f => f.status === 'done' || f.status === 'error')
              const caseSuccess   = items.every(f => f.status === 'done')

              return (
                <div key={groupKey ?? items[0].id}>
                  {/* Case banner */}
                  {isCase && (
                    <div className="mb-2 flex items-center justify-between px-1">
                      <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text)]/40">
                        Case — {items.length} documents
                      </span>
                      {caseSuccess && caseSessionId && (
                        <Link
                          href={`/report/${caseSessionId}?file=Case+Report&case=true`}
                          target="_blank"
                          className="text-sm font-bold text-[var(--color-primary)] hover:underline whitespace-nowrap"
                        >
                          View Case Report →
                        </Link>
                      )}
                      {caseAllDone && (
                        <button
                          onClick={() => removeCaseGroup(groupKey!)}
                          aria-label="Dismiss case"
                          className="ml-3 w-5 h-5 rounded-full bg-[var(--color-text)]/10 hover:bg-[var(--color-text)]/20 flex items-center justify-center transition-colors"
                        >
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                            <path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                          </svg>
                        </button>
                      )}
                    </div>
                  )}

                  {/* File rows */}
                  <div className={`flex flex-col gap-2 ${isCase ? 'border border-[var(--color-border)] rounded-2xl p-3 bg-white/50' : ''}`}>
                    {items.map(item => {
                      const { text, color } = statusLabel(item.status)
                      const canRemove = !isCase && item.status !== 'analysing'

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
                            {/* Separate mode: each file gets its own link */}
                            {!isCase && item.status === 'done' && item.sessionId && (
                              <Link
                                href={`/report/${item.sessionId}?file=${encodeURIComponent(item.file.name)}`}
                                target="_blank"
                                className="text-xs font-semibold text-[var(--color-primary)] hover:underline whitespace-nowrap"
                              >
                                View Report →
                              </Link>
                            )}
                            {item.status === 'error' && item.error && (
                              <span className="text-xs text-[var(--color-risk-high)] max-w-[120px] truncate">{item.error}</span>
                            )}
                            {(canRemove || (isCase && item.status !== 'analysing')) && (
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

      {/* Liquid-glass modal — rendered outside content flow so it's always centered */}
      {pendingFiles && (
        <IntentModal
          files={pendingFiles}
          onChoose={chooseIntent}
          onCancel={() => setPending(null)}
        />
      )}
    </main>
  )
}
