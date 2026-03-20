// supabase/functions/create-checkout/index.ts
// Stripe Checkout Sessionを作成するEdge Function
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.14.0?target=deno'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// コインパッケージの定義（フロントと一致させる）
const COIN_PACKAGES: Record<string, { coins: number; price: number }> = {
  'coins_5000':  { coins: 5000,  price: 500 },
  'coins_10000': { coins: 10000, price: 1000 },
  'coins_30000': { coins: 30000, price: 2800 },
}

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
      apiVersion: '2023-10-16',
    })

    // JWT認証
    const authHeader = req.headers.get('Authorization')!
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // リクエストボディからパッケージIDを取得
    const { packageId } = await req.json()
    const pkg = COIN_PACKAGES[packageId]
    if (!pkg) {
      return new Response(JSON.stringify({ error: 'Invalid package' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Supabase service client（RLSバイパス用）
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Stripe Checkout Session作成
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'jpy',
          product_data: {
            name: `${pkg.coins.toLocaleString()}コイン`,
            description: 'ソフトテニス One コイン購入',
          },
          unit_amount: pkg.price,
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${req.headers.get('origin') || 'https://soft-tennis-one.vercel.app'}/#payment-success`,
      cancel_url: `${req.headers.get('origin') || 'https://soft-tennis-one.vercel.app'}/#payment-cancel`,
      metadata: {
        user_id: user.id,
        coins: pkg.coins.toString(),
        package_id: packageId,
      },
    })

    // coin_purchasesに pending レコードを挿入
    await supabaseAdmin.from('coin_purchases').insert({
      user_id: user.id,
      coins: pkg.coins,
      amount_jpy: pkg.price,
      stripe_session_id: session.id,
      status: 'pending',
    })

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Checkout error:', err)
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
