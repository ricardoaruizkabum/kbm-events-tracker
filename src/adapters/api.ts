
import { Adapter } from '../types'

export const apiAdapter: Adapter = async (event) => {
  navigator.sendBeacon("/api/events", JSON.stringify(event))
}
