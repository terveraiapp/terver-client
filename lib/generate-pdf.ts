'use client'

import type { AnalysisResult, RiskScore, FindingStatus } from './types'

const W = 210, H = 297
const ML = 18, MR = 18, CW = W - ML - MR
const HEADER_H = 36

// Brand palette (RGB)
const C_CREAM   = [245, 240, 232] as const
const C_PRIMARY = [27,  67,  50]  as const
const C_ACCENT  = [201, 168, 76]  as const
const C_TEXT    = [17,  17,  17]  as const
const C_BORDER  = [226, 217, 204] as const
const C_HIGH    = [220, 38,  38]  as const
const C_MEDIUM  = [201, 168, 76]  as const
const C_LOW     = [27,  67,  50]  as const
const C_SUBTEXT = [140, 125, 100] as const

function riskRGB(score: RiskScore): readonly [number, number, number] {
  return score === 'HIGH' ? C_HIGH : score === 'MEDIUM' ? C_MEDIUM : C_LOW
}

function statusRGB(s: FindingStatus): readonly [number, number, number] {
  return s === 'FAIL' ? C_HIGH : s === 'WARN' ? C_MEDIUM : C_LOW
}

async function loadLogoBase64(): Promise<string | null> {
  try {
    const res = await fetch('/terver-logo.png')
    const blob = await res.blob()
    return new Promise((resolve) => {
      const fr = new FileReader()
      fr.onload = () => resolve(fr.result as string)
      fr.onerror = () => resolve(null)
      fr.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

export async function generatePDF(result: AnalysisResult, documentName: string) {
  const [{ jsPDF, GState }, logoBase64] = await Promise.all([
    import('jspdf') as Promise<{ jsPDF: typeof import('jspdf').jsPDF; GState: typeof import('jspdf').GState }>,
    loadLogoBase64(),
  ])

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  let page = 1

  // ── Utility ───────────────────────────────────────────────────────────────

  const fill = (rgb: readonly [number, number, number]) => doc.setFillColor(rgb[0], rgb[1], rgb[2])
  const ink  = (rgb: readonly [number, number, number]) => doc.setTextColor(rgb[0], rgb[1], rgb[2])

  // Colored pill badge — replaces Unicode dot characters entirely
  const statusPill = (status: FindingStatus, rightX: number, midY: number) => {
    const sc = statusRGB(status)
    const pw = 17, ph = 5.8
    const px = rightX - pw
    doc.setFillColor(sc[0], sc[1], sc[2])
    doc.roundedRect(px, midY - ph / 2, pw, ph, 1.5, 1.5, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    doc.text(status, px + pw / 2, midY + 1.2, { align: 'center' })
  }

  // ── Page decorators ───────────────────────────────────────────────────────

  const pageBg = () => {
    fill(C_CREAM)
    doc.rect(0, 0, W, H, 'F')
  }

  const watermark = () => {
    doc.saveGraphicsState()
    doc.setGState(new GState({ opacity: 0.05 }))
    ink(C_PRIMARY)
    doc.setFontSize(58)
    doc.setFont('helvetica', 'bold')
    doc.text('TERVER', W / 2, H / 2 - 10, { align: 'center', angle: 45 })
    doc.setFontSize(42)
    doc.text('VERIFIED', W / 2, H / 2 + 28, { align: 'center', angle: 45 })
    doc.restoreGraphicsState()
    doc.setFont('helvetica', 'normal')
  }

  const pageHeader = () => {
    // Dark green band
    fill(C_PRIMARY)
    doc.rect(0, 0, W, HEADER_H, 'F')
    // Gold underline
    fill(C_ACCENT)
    doc.rect(0, HEADER_H, W, 1, 'F')

    // Logo: white circle background then logo image
    const logoSize = 22, logoX = ML, logoY = (HEADER_H - logoSize) / 2
    if (logoBase64) {
      doc.addImage(logoBase64, 'PNG', logoX, logoY, logoSize, logoSize)
    }

    const tx = logoBase64 ? ML + logoSize + 5 : ML

    // Wordmark
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(17)
    doc.setFont('helvetica', 'bold')
    doc.text('TERVER', tx, HEADER_H / 2 + 1)
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(155, 195, 175)
    doc.text('Know what you own.', tx, HEADER_H / 2 + 7)

    // Risk score badge (white pill, coloured text)
    const rc = riskRGB(result.risk_score)
    const rl = result.risk_score === 'HIGH' ? 'HIGH RISK'
             : result.risk_score === 'MEDIUM' ? 'MEDIUM RISK' : 'LOW RISK'
    const bw = 38, bh = 18, bx = W - MR - bw, by = (HEADER_H - bh) / 2
    doc.setFillColor(255, 255, 255)
    doc.roundedRect(bx, by, bw, bh, 2.5, 2.5, 'F')
    doc.setTextColor(rc[0], rc[1], rc[2])
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'bold')
    doc.text(rl, bx + bw / 2, by + 6.5, { align: 'center' })
    doc.setFontSize(14)
    doc.text(`${result.overall_score}/100`, bx + bw / 2, by + 14.5, { align: 'center' })
  }

  const pageFooter = (p: number) => {
    fill(C_ACCENT)
    doc.rect(ML, H - 14, CW, 0.5, 'F')
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    ink(C_SUBTEXT)
    doc.text('Terver', ML, H - 8.5)
    doc.text('terverai.vercel.app', W / 2, H - 8.5, { align: 'center' })
    doc.text(`Page ${p}`, W - MR, H - 8.5, { align: 'right' })
  }

  const newPage = () => {
    pageFooter(page)
    doc.addPage()
    page++
    pageBg()
    watermark()
  }

  const checkY = (y: number, need = 18): number => {
    if (y + need > H - 20) { newPage(); return 22 }
    return y
  }

  const sectionHead = (label: string, y: number): number => {
    y = checkY(y, 14)
    fill(C_ACCENT)
    doc.rect(ML, y, 3.5, 8, 'F')
    ink(C_PRIMARY)
    doc.setFontSize(11.5)
    doc.setFont('helvetica', 'bold')
    doc.text(label, ML + 8, y + 6)
    return y + 14
  }

  const divider = (y: number): number => {
    fill(C_BORDER)
    doc.rect(ML, y, CW, 0.25, 'F')
    return y + 7
  }

  // ── Render page 1 ─────────────────────────────────────────────────────────
  pageBg()
  watermark()
  pageHeader()

  let y = HEADER_H + 12

  // Document title + date
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  ink(C_TEXT)
  const dname = documentName.length > 72 ? documentName.slice(0, 69) + '...' : documentName
  doc.text(dname, ML, y)
  y += 5.5
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  ink(C_SUBTEXT)
  const dateStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  doc.text(`Generated ${dateStr}  -  Terver Verified Report`, ML, y)
  y += 10

  y = divider(y)

  // ── Summary ───────────────────────────────────────────────────────────────
  y = sectionHead('Summary', y)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  ink(C_TEXT)
  const sumLines = doc.splitTextToSize(result.summary, CW) as string[]
  for (const line of sumLines) {
    y = checkY(y, 5)
    doc.text(line, ML, y)
    y += 5
  }
  y += 9

  // ── Documents in case ─────────────────────────────────────────────────────
  if (result.documents_identified?.length) {
    y = sectionHead('Documents in this Case', y)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    ink(C_TEXT)
    result.documents_identified.forEach((d, i) => {
      const lines = doc.splitTextToSize(`${i + 1}.  ${d}`, CW - 5) as string[]
      for (const line of lines) {
        y = checkY(y, 5)
        doc.text(line, ML + 4, y)
        y += 4.8
      }
      y += 2
    })
    y += 7
  }

  // ── Cross-document issues ─────────────────────────────────────────────────
  if (result.cross_document_issues?.length) {
    y = checkY(y, 22)

    // Red warning banner (no Unicode chars)
    doc.setFillColor(254, 226, 226)
    doc.roundedRect(ML, y, CW, 8, 1.5, 1.5, 'F')
    fill(C_HIGH)
    doc.rect(ML, y, 4, 8, 'F')
    ink(C_HIGH)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text('Cross-Document Issues', ML + 9, y + 5.5)
    y += 14

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    ink(C_TEXT)
    result.cross_document_issues.forEach((issue) => {
      // ASCII exclamation instead of Unicode warning sign
      const lines = doc.splitTextToSize(`[!]  ${issue}`, CW - 5) as string[]
      for (const line of lines) {
        y = checkY(y, 5)
        doc.text(line, ML + 4, y)
        y += 4.8
      }
      y += 2
    })
    y += 8
  }

  // ── Categories ────────────────────────────────────────────────────────────
  for (const cat of result.categories) {
    y = checkY(y, 24)

    // Category heading row
    fill(C_PRIMARY)
    doc.rect(ML, y, 3.5, 8, 'F')
    ink(C_PRIMARY)
    doc.setFontSize(10.5)
    doc.setFont('helvetica', 'bold')
    doc.text(cat.name, ML + 8, y + 5.8)

    // Proper colored pill badge on the right (no Unicode dot)
    statusPill(cat.status, W - MR, y + 4)
    y += 13

    // Findings — ASCII hyphen instead of Unicode bullet
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(55, 50, 45)
    for (const f of cat.findings) {
      const lines = doc.splitTextToSize(`-  ${f}`, CW - 7) as string[]
      for (const line of lines) {
        y = checkY(y, 5)
        doc.text(line, ML + 6, y)
        y += 4.8
      }
      y += 1.5
    }

    y = divider(y)
  }

  pageFooter(page)

  const safeName = documentName
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-zA-Z0-9]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 50)
  doc.save(`terver-report-${safeName}.pdf`)
}
