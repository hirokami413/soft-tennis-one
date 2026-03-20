import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-12-18.acacia' });

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const COIN_PACKAGES: Record<string, { coins: number; price: number }> = {
  coins_5000:  { coins: 5000,  price: 500 },
  coins_10000: { coins: 10000, price: 1000 },
  coins_30000: { coins: 30000, price: 2800 },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // JWT検証
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const supabaseUser = createClient(
      process.env.VITE_SUPABASE_URL!,
      process.env.VITE_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );
    const { data: { user }, error: authErr } = await supabaseUser.auth.getUser();
    if (authErr || !user) return res.status(401).json({ error: 'Unauthorized' });

    // パッケージ選択
    const { packageId } = req.body;
    const pkg = COIN_PACKAGES[packageId];
    if (!pkg) return res.status(400).json({ error: 'Invalid package' });

    // Stripe Checkout Session作成
    const origin = req.headers.origin || req.headers.referer || 'https://soft-tennis-one.vercel.app';
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
      success_url: `${origin}/#payment-success`,
      cancel_url: `${origin}/#payment-cancel`,
      metadata: {
        user_id: user.id,
        coins: pkg.coins.toString(),
        package_id: packageId,
      },
    });

    // 購入レコード挿入
    await supabaseAdmin.from('coin_purchases').insert({
      user_id: user.id,
      coins: pkg.coins,
      amount_jpy: pkg.price,
      stripe_session_id: session.id,
      status: 'pending',
    });

    return res.status(200).json({ url: session.url });
  } catch (err: any) {
    console.error('Checkout error:', err);
    return res.status(500).json({ error: err.message });
  }
}
