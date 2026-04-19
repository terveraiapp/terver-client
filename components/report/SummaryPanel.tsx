'use client'

import { useState } from 'react'
import type { AnalysisResult } from '@/lib/types'
import { generatePDF } from '@/lib/generate-pdf'

export function SummaryPanel({
  result,
  documentName,
}: {
  result: AnalysisResult
  documentName: string
}) {
  const [loading, setLoading] = useState(false)

  const handleDownload = async () => {
    if (loading) return
    setLoading(true)
    try {
      await generatePDF(result, documentName)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white border border-[var(--color-border)] rounded-xl p-6 flex flex-col gap-4">
      <h3 className="font-semibold text-sm text-[var(--color-text)]">Summary</h3>
      <p className="text-sm text-[var(--color-text)]/80 leading-relaxed">{result.summary}</p>
      <button
        onClick={handleDownload}
        disabled={loading}
        className="self-start px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
      >
        {loading ? 'Generating…' : 'Download PDF Report'}
      </button>
    </div>
  )
}
