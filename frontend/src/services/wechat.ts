import { authApi } from './auth'

interface SubscribeMessageResult {
  errMsg: string
  [templateId: string]: string
}

interface SubscribeMessageApi {
  requestSubscribeMessage(options: {
    tmplIds: string[]
    success: (result: SubscribeMessageResult) => void
    fail: (error: UniApp.GeneralCallbackResult) => void
  }): void
}

export type NotificationSubscriptionResult = 'accepted' | 'rejected' | 'unavailable'

export async function requestMealNotification(mealId: string, templateId: string): Promise<NotificationSubscriptionResult> {
  if (!mealId || !templateId) return 'unavailable'

  // #ifdef MP-WEIXIN
  const result = await new Promise<SubscribeMessageResult>((resolve, reject) => {
    const api = uni as unknown as SubscribeMessageApi
    api.requestSubscribeMessage({
      tmplIds: [templateId],
      success: resolve,
      fail: reject,
    })
  })
  const accepted = result[templateId] === 'accept'
  await authApi.saveNotificationSubscription(mealId, templateId, accepted)
  return accepted ? 'accepted' : 'rejected'
  // #endif

  // #ifndef MP-WEIXIN
  return 'unavailable'
  // #endif
}
