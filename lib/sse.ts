import { createParser, type EventSourceMessage } from 'eventsource-parser'

export async function* readSSEStream<T>(response: Response): AsyncGenerator<T> {
  const reader = response.body?.getReader()
  if (!reader) throw new Error('Response body is not readable')

  const decoder = new TextDecoder()
  const queue: T[] = []

  const parser = createParser({
    onEvent(event: EventSourceMessage) {
      try {
        queue.push(JSON.parse(event.data) as T)
      } catch {
        // skip malformed events
      }
    },
  })

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      parser.feed(decoder.decode(value, { stream: true }))
      while (queue.length > 0) {
        yield queue.shift()!
      }
    }
  } finally {
    reader.releaseLock()
  }
}
