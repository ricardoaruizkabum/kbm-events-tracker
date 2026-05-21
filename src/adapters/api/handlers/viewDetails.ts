import { EventHandler } from "../../../types"

type ViewDetailsResponse = {
  userId: string
  planId: string
}

export const viewDetailsHandler: EventHandler<ViewDetailsResponse> = (event) => {
  const { user, plan } = event.data || {}
  return {
    userId: user,
    planId: plan
  }
}