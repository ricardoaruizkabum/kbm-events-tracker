
import { Adapter, EventHandler } from '../../types'
import { bannerViewedHandler, viewDetailsHandler } from './handlers'

const eventMap: Record<string, EventHandler<unknown>> = {
  'view_details': viewDetailsHandler,
  'banner_viewed': bannerViewedHandler
}

export const apiAdapter: Adapter = async (event) => {
  const handler = eventMap[event.name]
  if (!handler) return
  
  const result = handler(event)
  console.log(`🚀 Adapter: apiAdapter, event: ${event.name}`, result)  
}
