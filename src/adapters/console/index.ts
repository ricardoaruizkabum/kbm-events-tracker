
import { Adapter, EventHandler } from '../../types'
import { addToCartHandler, bannerViewedHandler, favoriteHandler } from './handlers'

const eventMap: Record<string, EventHandler> = {
  'favorite': favoriteHandler,
  'add_to_cart': addToCartHandler,
  'banner_viewed': bannerViewedHandler
}

export const consoleAdapter: Adapter = (event) => {
  eventMap[event.name]?.(event)
}
