'use client'

import { useCallback, useState } from 'react'

const ACCEPTED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

const MAX_SIZE_MB = 100

interface DropZoneProps {
  onFiles: (files: File[]) => void
  disabled?: boolean
}

function validateFile(file: File): string | null {
  const mime = file.type ||
    (file.name.endsWith('.docx')
      ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      : file.name.endsWith('.doc')
      ? 'application/msword'
      : '')

  if (!ACCEPTED_MIME_TYPES.includes(mime)) {
    return `${file.name}: unsupported type. Accepted: PDF, JPG, PNG, WEBP, DOC, DOCX.`
  }
  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    return `${file.name}: exceeds ${MAX_SIZE_MB}MB limit.`
  }
  return null
}

export function DropZone({ onFiles, disabled }: DropZoneProps) {
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFiles = useCallback(
    (rawFiles: FileList | null) => {
      if (!rawFiles || rawFiles.length === 0) return
      const files = Array.from(rawFiles)
      const errors = files.map(validateFile).filter(Boolean)
      if (errors.length > 0) {
        setError(errors[0]!)
        return
      }
      setError(null)
      onFiles(files)
    },
    [onFiles]
  )

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    handleFiles(e.dataTransfer.files)
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
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
      >
        <input
          type="file"
          className="hidden"
          accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
          multiple
          onChange={(e) => handleFiles(e.target.files)}
          disabled={disabled}
        />
        <div className="flex flex-col items-center gap-3 pointer-events-none px-6 text-center">
          <div className="text-4xl">📄</div>
          <p className="text-sm font-medium text-[var(--color-primary)]">
            Drop your property documents here
          </p>
          <p className="text-xs text-[var(--color-text)]/50">
            PDF, JPG, PNG, WEBP, DOC, DOCX — up to 100MB each — multiple files supported
          </p>
        </div>
      </label>
      {error !== null && (
        <p className="mt-2 text-sm text-[var(--color-risk-high)] text-center">{error}</p>
      )}
    </div>
  )
}
