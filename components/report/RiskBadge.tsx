import type { RiskScore } from '@/lib/types'

const config: Record<RiskScore, { label: string; bg: string; text: string }> = {
  LOW: {
    label: 'LOW RISK',
    bg: 'bg-[var(--color-risk-low)]/10',
    text: 'text-[var(--color-risk-low)]',
  },
  MEDIUM: {
    label: 'MEDIUM RISK',
    bg: 'bg-[var(--color-risk-medium)]/10',
    text: 'text-[var(--color-risk-medium)]',
  },
  HIGH: {
    label: 'HIGH RISK',
    bg: 'bg-[var(--color-risk-high)]/10',
    text: 'text-[var(--color-risk-high)]',
  },
}

export function RiskBadge({ score, overall }: { score: RiskScore; overall: number }) {
  const { label, bg, text } = config[score]
  return (
    <div className={`inline-flex items-center gap-3 px-5 py-3 rounded-xl ${bg}`}>
      <span className={`text-2xl font-bold ${text}`}>{label}</span>
      <span className={`text-sm font-medium ${text} opacity-70`}>{overall}/100</span>
    </div>
  )
}
