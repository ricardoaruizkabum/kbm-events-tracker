import { EventHandler } from "../../../types"

export type BannerViewedResponse = {
  bannerId: string
  userId: string
  offer: string
}

export const bannerViewedHandler: EventHandler<BannerViewedResponse> = (event) => {
  const { banner, user, offer } = event.data || {}
  return {
    bannerId: banner,
    userId: user,
    offer
  }
}