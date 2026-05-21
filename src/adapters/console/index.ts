
import { Adapter, EventHandler } from '../../types'
import { addToCartHandler, bannerViewedHandler, favoriteHandler } from './handlers'

const eventMap: Record<string, EventHandler<unknown>> = {
  'favorite': favoriteHandler,
  'add_to_cart': addToCartHandler,
  'banner_viewed': bannerViewedHandler
}

export const consoleAdapter: Adapter = (event) => {
  const handler = eventMap[event.name]
  if (!handler) return

  const result = handler(event)
  console.log(`🚀 Adapter: consoleAdapter, event: ${event.name}`, result)  
}
