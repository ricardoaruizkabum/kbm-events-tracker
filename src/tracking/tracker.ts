import { Adapter, TrackEvent  } from '../types'

type RegisteredAdapter = { app: string; fn: Adapter }

class Tracker {
  private adapters: RegisteredAdapter[] = []
  private queues = new Map<string, TrackEvent[]>()
  private sending = new Set<string>()

  register(adapter: Adapter, app: string) {
    this.adapters.push({ app, fn: adapter })
  }

  track(event: TrackEvent) {
    const e = { ...event, ts: Date.now() }
    const queue = this.queues.get(e.app) ?? []
    queue.push(e)
    this.queues.set(e.app, queue)
    this.flush(e.app)
  }

  private async flush(app: string) {
    if (this.sending.has(app)) return
    this.sending.add(app)

    const queue = this.queues.get(app) ?? []
    const appAdapters = this.adapters.filter(a => a.app === app)

    while (queue.length) {
      const event = queue[0]
      try {
        await Promise.all(appAdapters.map(a => a.fn(event)))
        queue.shift()
      } catch {
        await new Promise(r => setTimeout(r, 500))
      }
    }

    this.sending.delete(app)
  }
}

export const tracker = new Tracker()
