import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-12-18.acacia' });
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// Vercel Serverless FunctionのRAW body取得のため
export const config = {
  api: { bodyParser: false },
};

async function getRawBody(req: VercelRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const rawBody = await getRawBody(req);
    const sig = req.headers['stripe-signature']!;

    const event = stripe.webhooks.constructEvent(rawBody, sig, endpointSecret);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.user_id;
      const coins = parseInt(session.metadata?.coins || '0', 10);

      if (!userId || !coins) {
        console.error('Missing metadata:', session.metadata);
        return res.status(400).json({ error: 'Missing metadata' });
      }

      // ステータス更新
      await supabaseAdmin
        .from('coin_purchases')
        .update({ status: 'completed' })
        .eq('stripe_session_id', session.id);

      // コイン加算
      const { error: coinErr } = await supabaseAdmin.rpc('add_coins', {
        p_user_id: userId,
        p_amount: coins,
      });

      if (coinErr) {
        console.error('Failed to add coins:', coinErr);
        return res.status(500).json({ error: 'Failed to add coins' });
      }

      console.log(`✅ Added ${coins} coins to user ${userId}`);
    }

    return res.status(200).json({ received: true });
  } catch (err: any) {
    console.error('Webhook error:', err.message);
    return res.status(400).json({ error: err.message });
  }
}
