'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { DropZone } from '@/components/upload/DropZone'
import { analyzeDocument } from '@/lib/api'
import { uploadStore } from '@/lib/upload-store'

export default function LandingPage() {
  const router = useRouter()
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFile = async (file: File) => {
    setUploading(true)
    setError(null)
    uploadStore.pendingFile = file
    try {
      for await (const event of analyzeDocument(file)) {
        if (event.type === 'session' && event.session_id) {
          router.push(`/report/${event.session_id}?file=${encodeURIComponent(file.name)}`)
          return
        }
      }
    } catch (err: unknown) {
      uploadStore.pendingFile = null
      setError(err instanceof Error ? err.message : 'Upload failed. Please try again.')
      setUploading(false)
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-xl flex flex-col items-center gap-10">
        {/* Logo + Wordmark */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-xl bg-[var(--color-primary)] flex items-center justify-center">
            <span className="text-[var(--color-accent)] text-2xl font-bold">T</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-[var(--color-primary)]">
            Terver
          </h1>
          <p className="text-base text-[var(--color-text)]/60 text-center">
            Know what you own.
          </p>
        </div>

        {/* Upload Zone */}
        <div className="w-full">
          {uploading ? (
            <div className="flex flex-col items-center gap-4 py-16">
              <div className="w-10 h-10 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-[var(--color-text)]/60">Uploading document…</p>
            </div>
          ) : (
            <DropZone onFile={handleFile} disabled={uploading} />
          )}
          {error !== null ? (
            <p className="mt-3 text-sm text-[var(--color-risk-high)] text-center">{error}</p>
          ) : null}
        </div>

        {/* Footer note */}
        <p className="text-xs text-[var(--color-text)]/40 text-center max-w-sm">
          Upload any title deed, indenture, site plan, or conveyance.
          No account required. Your document is analysed privately.
        </p>
      </div>
    </main>
  )
}
