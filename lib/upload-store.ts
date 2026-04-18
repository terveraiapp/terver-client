interface SessionEntry {
  files: File[]
  isCase: boolean
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
