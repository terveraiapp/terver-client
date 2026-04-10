'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { analyzeDocument } from '@/lib/api'
import { uploadStore } from '@/lib/upload-store'
import type { AnalysisResult } from '@/lib/types'
import Link from 'next/link'
import { RiskBadge } from '@/components/report/RiskBadge'
import { CategoryCard } from '@/components/report/CategoryCard'
import { SummaryPanel } from '@/components/report/SummaryPanel'
import { ChatPanel } from '@/components/chat/ChatPanel'

type PageState = 'analyzing' | 'done' | 'error'

export default function ReportPage() {
  const params = useParams()
  const sessionId = params.sessionId as string
  const searchParams = useSearchParams()
  const fileName = searchParams.get('file') || 'document'

  const [pageState, setPageState] = useState<PageState>('analyzing')
  const [streamedTokens, setStreamedTokens] = useState('')
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const hasStarted = useRef(false)

  useEffect(() => {
    const file = uploadStore.pendingFile
    if (!file || hasStarted.current) return
    hasStarted.current = true

    ;(async () => {
      try {
        let rawJson = ''
        for await (const event of analyzeDocument(file)) {
          if (event.type === 'token' && event.token) {
            rawJson += event.token
            setStreamedTokens(rawJson)
          }
          if (event.type === 'done' && event.raw) {
            rawJson = event.raw
          }
          if (event.type === 'error') {
            throw new Error(event.message || 'Analysis error')
          }
        }
        const parsed: AnalysisResult = JSON.parse(rawJson)
        setResult(parsed)
        setPageState('done')
        uploadStore.pendingFile = null
      } catch (err: unknown) {
        setErrorMsg(err instanceof Error ? err.message : 'Analysis failed.')
        setPageState('error')
      }
    })()
  }, [])

  if (pageState === 'analyzing') {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6 gap-6">
        <div className="w-10 h-10 border-4 border-[var(--color-primary)] border-t-[var(--color-accent)] rounded-full animate-spin" />
        <p className="text-sm font-medium text-[var(--color-text)]/70">Analysing document…</p>
        {streamedTokens.length > 0 ? (
          <pre className="max-w-xl w-full text-xs text-[var(--color-text)]/40 bg-white border border-[var(--color-border)] rounded-xl p-4 overflow-auto max-h-48 font-mono">
            {streamedTokens}
          </pre>
        ) : null}
      </main>
    )
  }

  if (pageState === 'error') {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6 gap-4">
        <p className="text-[var(--color-risk-high)] font-medium">Analysis failed</p>
        <p className="text-sm text-[var(--color-text)]/60">{errorMsg}</p>
        <Link href="/" className="text-sm text-[var(--color-primary)] underline">
          Try again
        </Link>
      </main>
    )
  }

  if (!result) return null

  const documentContext = JSON.stringify(result)

  return (
    <main className="min-h-screen px-6 py-10">
      <div className="max-w-6xl mx-auto flex flex-col gap-8">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-[var(--color-primary)] font-bold text-lg">
              Terver
            </Link>
            <span className="text-[var(--color-text)]/30">/</span>
            <span className="text-sm text-[var(--color-text)]/60 truncate max-w-[200px]">
              {fileName}
            </span>
          </div>
          <RiskBadge score={result.risk_score} overall={result.overall_score} />
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6 items-start">
          {/* Left — Report */}
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {result.categories.map((cat) => (
                <CategoryCard key={cat.name} category={cat} />
              ))}
            </div>
            <SummaryPanel result={result} documentName={fileName} />
          </div>

          {/* Right — Amberlyn */}
          <div className="h-[600px] lg:sticky lg:top-6">
            <ChatPanel sessionId={sessionId} documentContext={documentContext} />
          </div>
        </div>
      </div>
    </main>
  )
}
