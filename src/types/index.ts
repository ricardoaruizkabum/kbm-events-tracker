export type TrackEvent = {
  app: string
  name: string
  data?: Record<string, any>
  ts?: number
}

export type Adapter = (event: TrackEvent) => Promise<void> | void

export type EventHandler = (event: TrackEvent) => Promise<void> | void
