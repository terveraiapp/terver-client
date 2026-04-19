'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { analyzeDocument, analyzeCase } from '@/lib/api'
import { uploadStore } from '@/lib/upload-store'
import type { AnalysisResult } from '@/lib/types'
import Link from 'next/link'
import { RiskBadge } from '@/components/report/RiskBadge'
import { CategoryCard } from '@/components/report/CategoryCard'
import { SummaryPanel } from '@/components/report/SummaryPanel'
import { ChatPanel } from '@/components/chat/ChatPanel'

const LOADING_PHRASES = [
  'Reading title chain…',
  'Checking ownership integrity…',
  'Scanning for fraud indicators…',
  'Verifying registration status…',
  'Inspecting boundary descriptions…',
  'Cross-referencing survey numbers…',
  'Checking for encumbrances…',
  'Reviewing execution clauses…',
  'Validating grantor & grantee details…',
  'Analysing stamp duty references…',
  'Looking for double-sale markers…',
  'Checking Land Commission records…',
  'Reviewing conveyance dates…',
  'Assessing document completeness…',
  'Finalising risk assessment…',
]

function useLoadingPhrase() {
  const [index, setIndex] = useState(0)
  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % LOADING_PHRASES.length)
    }, 2800)
    return () => clearInterval(id)
  }, [])
  return LOADING_PHRASES[index]
}

type PageState = 'analyzing' | 'done' | 'error'

export default function ReportPage() {
  const params = useParams()
  const sessionId = params.sessionId as string
  const searchParams = useSearchParams()
  const fileName = searchParams.get('file') || 'document'
  const isCase = searchParams.get('case') === 'true'

  const [pageState, setPageState] = useState<PageState>('analyzing')
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const hasStarted = useRef(false)
  const loadingPhrase = useLoadingPhrase()

  useEffect(() => {
    if (hasStarted.current) return
    hasStarted.current = true

    // Fast path: result in memory or sessionStorage (survives new-tab navigation)
    const cached = uploadStore.getResult(sessionId)
    if (cached) {
      setResult(cached)
      setPageState('done')
      uploadStore.delete(sessionId)
      return
    }

    // Fallback: File objects available (same-tab hard-refresh edge case)
    const entry = uploadStore.get(sessionId)
    if (!entry) {
      setErrorMsg('Session expired. Please upload your documents again.')
      setPageState('error')
      return
    }

    ;(async () => {
      try {
        let rawJson = ''
        const stream = entry.isCase
          ? analyzeCase(entry.files)
          : analyzeDocument(entry.files[0])

        for await (const event of stream) {
          if (event.type === 'token' && event.token) rawJson += event.token
          if (event.type === 'done' && event.raw) rawJson = event.raw
          if (event.type === 'error') throw new Error(event.message || 'Analysis error')
        }
        const parsed: AnalysisResult = JSON.parse(rawJson)
        setResult(parsed)
        setPageState('done')
        uploadStore.delete(sessionId)
      } catch (err: unknown) {
        setErrorMsg(err instanceof Error ? err.message : 'Analysis failed.')
        setPageState('error')
      }
    })()
  }, [sessionId])

  if (pageState === 'analyzing') {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6 gap-5">
        <div className="w-10 h-10 border-4 border-[var(--color-primary)] border-t-[var(--color-accent)] rounded-full animate-spin" />
        <div className="flex flex-col items-center gap-1">
          <p className="text-sm font-medium text-[var(--color-text)]/70">{isCase ? 'Analysing case…' : 'Analysing document…'}</p>
          <p
            key={loadingPhrase}
            className="text-xs text-[var(--color-text)]/40 animate-pulse transition-all duration-500"
          >
            {loadingPhrase}
          </p>
        </div>
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
            {/* Case-only: documents identified + cross-document issues */}
            {result.documents_identified && result.documents_identified.length > 0 && (
              <div className="rounded-xl border border-[var(--color-border)] bg-white p-4 flex flex-col gap-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text)]/40">Documents in this case</p>
                <ul className="flex flex-col gap-1">
                  {result.documents_identified.map((doc, i) => (
                    <li key={i} className="text-sm text-[var(--color-text)]/70">📄 {doc}</li>
                  ))}
                </ul>
              </div>
            )}
            {result.cross_document_issues && result.cross_document_issues.length > 0 && (
              <div className="rounded-xl border border-[var(--color-risk-high)]/30 bg-[var(--color-risk-high)]/5 p-4 flex flex-col gap-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-risk-high)]">Cross-document issues</p>
                <ul className="flex flex-col gap-1.5">
                  {result.cross_document_issues.map((issue, i) => (
                    <li key={i} className="text-sm text-[var(--color-text)]/80">⚠ {issue}</li>
                  ))}
                </ul>
              </div>
            )}

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
