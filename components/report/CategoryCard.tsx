import type { CategoryFinding, FindingStatus } from '@/lib/types'

const statusStyles: Record<FindingStatus, { dot: string; label: string }> = {
  PASS: { dot: 'bg-[var(--color-risk-low)]', label: 'Pass' },
  WARN: { dot: 'bg-[var(--color-risk-medium)]', label: 'Warning' },
  FAIL: { dot: 'bg-[var(--color-risk-high)]', label: 'Fail' },
}

export function CategoryCard({ category }: { category: CategoryFinding }) {
  const { dot, label } = statusStyles[category.status]
  return (
    <div className="bg-white border border-[var(--color-border)] rounded-xl p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm text-[var(--color-text)]">{category.name}</h3>
        <div className="flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full ${dot}`} />
          <span className="text-xs text-[var(--color-text)]/60">{label}</span>
        </div>
      </div>
      {category.findings.length > 0 ? (
        <ul className="flex flex-col gap-1.5">
          {category.findings.map((finding, i) => (
            <li
              key={i}
              className="text-xs text-[var(--color-text)]/70 leading-relaxed pl-3 border-l-2 border-[var(--color-border)]"
            >
              {finding}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
