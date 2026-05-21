import { EventHandler } from "../../../types"

export const addToCartHandler: EventHandler = (event) => {
  console.log("Console Adapter - Handling add to cart event:", event)
}