import { EventHandler } from "../../../types"

export const favoriteHandler: EventHandler = (event) => {
  console.log("Console Adapter - Handling favorite event:", event)
}