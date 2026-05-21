import { EventHandler } from "../../../types"

type AddToCartResponse = {
  userId: string
  productId: string
  quantity: number
}

export const addToCartHandler: EventHandler<AddToCartResponse> = (event) => {
  const { user, product, quantity } = event.data || {}
  return {
    userId: user,
    productId: product,
    quantity: quantity || 1
  }
}