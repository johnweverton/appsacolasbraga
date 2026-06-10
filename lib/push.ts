import webpush from 'web-push'
import { createAdminClient } from '@/lib/supabase/admin'

webpush.setVapidDetails(
  'mailto:admin@sacolasbraga.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

export async function enviarPushParaUsuario(
  userId: string,
  titulo: string,
  corpo: string,
  url = '/'
) {
  try {
    const db = createAdminClient()
    const { data: subs } = await db
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', userId)

    if (!subs || subs.length === 0) return

    const payload = JSON.stringify({ titulo, corpo, url })

    await Promise.allSettled(
      subs.map((sub) =>
        webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        ).catch(async (err) => {
          // Remove subscriptions inválidas (410 = expirada)
          if (err.statusCode === 410) {
            await db.from('push_subscriptions').delete()
              .eq('endpoint', sub.endpoint)
          }
        })
      )
    )
  } catch {
    // Push falhou — não bloqueia a operação
  }
}
