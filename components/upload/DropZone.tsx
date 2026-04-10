'use client'

import { useCallback, useState } from 'react'

const ACCEPTED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE_MB = 100

interface DropZoneProps {
  onFile: (file: File) => void
  disabled?: boolean
}

export function DropZone({ onFile, disabled }: DropZoneProps) {
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const validate = (file: File): string | null => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return 'Unsupported file type. Please upload a PDF or image.'
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      return `File too large. Maximum size is ${MAX_SIZE_MB}MB.`
    }
    return null
  }

  const handleFile = useCallback(
    (file: File) => {
      const err = validate(file)
      if (err) {
        setError(err)
        return
      }
      setError(null)
      onFile(file)
    },
    [onFile]
  )

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  return (
    <div className="w-full">
      <label
        className={[
          'flex flex-col items-center justify-center w-full h-52 rounded-2xl border-2 border-dashed cursor-pointer transition-all',
          dragOver
            ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/5'
            : 'border-[var(--color-border)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary)]/5',
          disabled ? 'opacity-50 cursor-not-allowed' : '',
        ].join(' ')}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
      >
        <input
          type="file"
          className="hidden"
          accept=".pdf,.jpg,.jpeg,.png,.webp"
          onChange={onChange}
          disabled={disabled}
        />
        <div className="flex flex-col items-center gap-3 pointer-events-none px-6 text-center">
          <div className="text-4xl">📄</div>
          <p className="text-sm font-medium text-[var(--color-primary)]">
            Drop your property document here
          </p>
          <p className="text-xs text-[var(--color-text)]/50">PDF, JPG, PNG, WEBP — up to 100MB</p>
        </div>
      </label>
      {error !== null ? (
        <p className="mt-2 text-sm text-[var(--color-risk-high)] text-center">{error}</p>
      ) : null}
    </div>
  )
}
