'use client'

import type { AnalysisResult } from '@/lib/types'

export function SummaryPanel({
  result,
  documentName,
}: {
  result: AnalysisResult
  documentName: string
}) {
  const handleDownload = () => {
    import('jspdf').then(({ jsPDF }) => {
      const doc = new jsPDF()
      let y = 20

      doc.setFontSize(18)
      doc.text('Terver — Property Risk Report', 20, y)
      y += 10

      doc.setFontSize(11)
      doc.text(`Document: ${documentName}`, 20, y)
      y += 6
      doc.text(`Risk Score: ${result.risk_score} (${result.overall_score}/100)`, 20, y)
      y += 10

      doc.setFontSize(12)
      doc.text('Summary', 20, y)
      y += 6
      doc.setFontSize(10)
      const summaryLines = doc.splitTextToSize(result.summary, 170)
      doc.text(summaryLines, 20, y)
      y += summaryLines.length * 6 + 8

      result.categories.forEach((cat) => {
        doc.setFontSize(11)
        doc.text(`${cat.name} — ${cat.status}`, 20, y)
        y += 6
        doc.setFontSize(9)
        cat.findings.forEach((f) => {
          const lines = doc.splitTextToSize(`• ${f}`, 165)
          doc.text(lines, 25, y)
          y += lines.length * 5 + 2
          if (y > 270) {
            doc.addPage()
            y = 20
          }
        })
        y += 4
      })

      doc.save(`terver-report-${documentName.replace(/\.[^.]+$/, '')}.pdf`)
    })
  }

  return (
    <div className="bg-white border border-[var(--color-border)] rounded-xl p-6 flex flex-col gap-4">
      <h3 className="font-semibold text-sm text-[var(--color-text)]">Summary</h3>
      <p className="text-sm text-[var(--color-text)]/80 leading-relaxed">{result.summary}</p>
      <button
        onClick={handleDownload}
        className="self-start px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
      >
        Download PDF Report
      </button>
    </div>
  )
}
