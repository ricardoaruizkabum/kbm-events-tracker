import { EventHandler } from "../../../types"

type FavoriteResponse = {
  userId: string
  productId: string
}

export const favoriteHandler: EventHandler<FavoriteResponse> = (event) => {
  const { user, product } = event.data || {}
  return {
    userId: user,
    productId: product
  }
}