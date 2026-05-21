import { EventHandler } from "../../../types"

export const bannerViewedHandler: EventHandler = (event) => {
  console.log("Console Adapter - Handling banner_viewed event:", event)
}