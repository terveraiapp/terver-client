import type { AnalysisResult } from './types'

interface SessionEntry {
  files: File[]
  isCase: boolean
  result?: AnalysisResult
}

class UploadStore {
  private sessions = new Map<string, SessionEntry>()

  set(sessionId: string, entry: SessionEntry) {
    this.sessions.set(sessionId, entry)
    if (entry.result) {
      try {
        localStorage.setItem(`terver_result_${sessionId}`, JSON.stringify(entry.result))
      } catch {}
    }
  }

  get(sessionId: string): SessionEntry | undefined {
    return this.sessions.get(sessionId)
  }

  // Works across tab boundaries by falling back to localStorage
  getResult(sessionId: string): AnalysisResult | null {
    const entry = this.sessions.get(sessionId)
    if (entry?.result) return entry.result
    try {
      const raw = localStorage.getItem(`terver_result_${sessionId}`)
      if (raw) return JSON.parse(raw) as AnalysisResult
    } catch {}
    return null
  }

  delete(sessionId: string) {
    this.sessions.delete(sessionId)
    try { localStorage.removeItem(`terver_result_${sessionId}`) } catch {}
  }
}

export const uploadStore = new UploadStore()
