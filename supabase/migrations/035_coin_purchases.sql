-- coin_purchases: コイン購入履歴テーブル
CREATE TABLE IF NOT EXISTS coin_purchases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  coins INTEGER NOT NULL,
  amount_jpy INTEGER NOT NULL,
  stripe_session_id TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_coin_purchases_user ON coin_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_coin_purchases_stripe ON coin_purchases(stripe_session_id);

-- RLS
ALTER TABLE coin_purchases ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分の購入履歴のみ閲覧可
CREATE POLICY "Users can view own purchases"
  ON coin_purchases FOR SELECT
  USING (auth.uid() = user_id);

-- Edge Functionからの挿入・更新用（service_role経由）
-- service_roleは RLS をバイパスするため、追加ポリシーは不要
