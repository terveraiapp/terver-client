import type { AnalysisResult } from './types'

interface SessionEntry {
  files: File[]
  isCase: boolean
  result?: AnalysisResult  // stored once analysis completes — report page reads this directly
}

class UploadStore {
  private sessions = new Map<string, SessionEntry>()

  set(sessionId: string, entry: SessionEntry) {
    this.sessions.set(sessionId, entry)
  }

  get(sessionId: string): SessionEntry | undefined {
    return this.sessions.get(sessionId)
  }

  delete(sessionId: string) {
    this.sessions.delete(sessionId)
  }
}

export const uploadStore = new UploadStore()
