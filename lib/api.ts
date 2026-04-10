import { readSSEStream } from './sse'
import type { AnalysisStreamEvent, ChatStreamEvent } from './types'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export async function* analyzeDocument(
  file: File
): AsyncGenerator<AnalysisStreamEvent> {
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch(`${BASE_URL}/analyze`, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Upload failed' }))
    throw new Error(error.detail || `Error ${response.status}`)
  }

  yield* readSSEStream<AnalysisStreamEvent>(response)
}

export async function* chatWithAmberlyn(
  sessionId: string,
  message: string,
  documentContext: string
): AsyncGenerator<ChatStreamEvent> {
  const response = await fetch(`${BASE_URL}/chat/${sessionId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, document_context: documentContext }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Chat failed' }))
    throw new Error(error.detail || `Error ${response.status}`)
  }

  yield* readSSEStream<ChatStreamEvent>(response)
}
