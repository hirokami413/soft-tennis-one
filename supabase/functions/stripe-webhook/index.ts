// supabase/functions/stripe-webhook/index.ts
// Stripe Webhookを受信してコイン加算を行うEdge Function
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.14.0?target=deno'

const cryptoProvider = Stripe.createSubtleCryptoProvider()

serve(async (req) => {
  try {
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
      apiVersion: '2023-10-16',
    })

    // Webhook署名の検証
    const body = await req.text()
    const signature = req.headers.get('stripe-signature')!
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!

    const event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret,
      undefined,
      cryptoProvider,
    )

    // checkout.session.completed イベントのみ処理
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session

      // メタデータからユーザーIDとコイン数を取得
      const userId = session.metadata?.user_id
      const coins = parseInt(session.metadata?.coins || '0', 10)

      if (!userId || !coins) {
        console.error('Missing metadata:', session.metadata)
        return new Response('Missing metadata', { status: 400 })
      }

      // Supabase service client（RLSバイパス）
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      )

      // coin_purchasesのステータスをcompletedに更新
      const { error: updateError } = await supabaseAdmin
        .from('coin_purchases')
        .update({ status: 'completed' })
        .eq('stripe_session_id', session.id)

      if (updateError) {
        console.error('Failed to update purchase:', updateError)
      }

      // コインを加算
      const { error: coinError } = await supabaseAdmin.rpc('add_coins', {
        p_user_id: userId,
        p_amount: coins,
      })

      if (coinError) {
        console.error('Failed to add coins:', coinError)
        return new Response('Failed to add coins', { status: 500 })
      }

      console.log(`✅ Added ${coins} coins to user ${userId}`)
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Webhook error:', err)
    return new Response(`Webhook Error: ${(err as Error).message}`, { status: 400 })
  }
})
