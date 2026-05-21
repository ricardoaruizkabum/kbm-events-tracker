
import { Adapter, EventHandler } from '../../types'
import { viewDetailsHandler } from './handlers'

const eventMap: Record<string, EventHandler> = {
  'view_details': viewDetailsHandler,
}

export const apiAdapter: Adapter = async (event) => {
  eventMap[event.name]?.(event)
}
