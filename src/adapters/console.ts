
import { Adapter } from '../types'

export const consoleAdapter: Adapter = (event) => {
  console.log("Tracked:", event)
}
