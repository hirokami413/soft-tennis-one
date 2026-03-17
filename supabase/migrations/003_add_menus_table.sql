-- =============================================
-- ソフトテニス One - メニューテーブル追加
-- Supabase Dashboard の SQL Editor で実行
-- =============================================

-- ── 1. menus テーブルの作成 ──
CREATE TABLE IF NOT EXISTS menus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  level TEXT NOT NULL,
  description TEXT NOT NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  youtube_url TEXT NOT NULL DEFAULT '',
  instagram_url TEXT NOT NULL DEFAULT '',
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published', 'reviewing')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_menus_category_status ON menus(category, status);
CREATE INDEX idx_menus_author ON menus(author_id);

-- ── 2. Row Level Security (RLS) の設定 ──
ALTER TABLE menus ENABLE ROW LEVEL SECURITY;

CREATE POLICY "メニュー: 公開中のメニューは誰でも閲覧可能"
  ON menus FOR SELECT
  USING (status = 'published');

CREATE POLICY "メニュー: ログインユーザーはメニューを投稿可能"
  ON menus FOR INSERT
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "メニュー: 自分自身の投稿は編集・削除可能"
  ON menus FOR UPDATE
  USING (auth.uid() = author_id);

CREATE POLICY "メニュー: 自分自身の投稿は削除可能"
  ON menus FOR DELETE
  USING (auth.uid() = author_id);

-- ── 3. favorites テーブルとの紐付け用ビュー (オプション) ──
-- 以降のフェーズで必要になるメニューの「お気に入りカウント」等を取得しやすくするためのビュー
CREATE OR REPLACE VIEW menu_details AS
SELECT 
  m.*,
  p.nickname as author_nickname,
  p.avatar_emoji as author_avatar,
  (SELECT COUNT(*) FROM favorites f WHERE f.menu_id = m.id::TEXT) as favorites_count
FROM menus m
JOIN profiles p ON m.author_id = p.id;

-- ── 4. 初期ダミーデータの投入 (Adminユーザーに紐付けるか、仮のUUIDを使用) ──
-- ※この実行者が最初のダミーデータの「投稿者」として記録されます。
DO $$
DECLARE
  v_user_id UUID;
BEGIN
  -- 現在ログインしているユーザー、または取得可能なユーザーを1名取得
  SELECT id INTO v_user_id FROM profiles LIMIT 1;
  
  -- もしユーザーが存在していれば、初期のダミーデータをmenusに挿入します。
  IF v_user_id IS NOT NULL THEN
    INSERT INTO menus (title, category, level, description, tags, youtube_url, author_id) VALUES
    ('ベースライン 振り回し（フォア主体）', 'フォアハンド', '中級', '半面を使い、球出しが左右にボールを振り分け、プレイヤーが走り込みながらフォアハンドを打つ練習。回り込みのフットワーク向上を目的とします。', '{"フットワーク", "基礎練習"}', 'https://www.youtube.com/watch?v=F_Yv2y50iuk', v_user_id),
    ('バックハンド 押し込み練習', 'バックハンド', '中級', 'バックハンドの打点を前にし、体重を乗せて深くコントロールする練習。', '{"深いボール", "体重移動"}', '', v_user_id),
    ('V字ボレー・スマッシュ', 'ボレー', '上級', '前衛の基本となるV字の動きを身につける練習。ボレー、ポーチ、スマッシュの連続動作で実戦的なポジション移動を強化します。', '{"前衛特化", "V字移動", "ポーチ"}', '', v_user_id),
    ('確率重視・ターゲットサーブ', 'サーブ', '初級〜中級', 'スピードよりも「狙ったコースに確実に入れる」ことを主眼に置いたサーブ練習。コーンを的として配置します。', '{}', '', v_user_id),
    ('ロブチェイス＆スマッシュ決める', 'スマッシュ', '中級〜上級', '後方に上げられた深いロブを追いかけ、ポジションを立て直してスマッシュを決める練習。', '{}', '', v_user_id),
    ('前衛・後衛 2対2 ポイント練習', '実戦形式', '上級', 'サーブから始まり、ポイントごとの陣形移動や戦術の確認を行う本格的な実戦練習。クロス展開からストレート展開への切り替えを意識します。', '{"実戦", "陣形", "ペア練習"}', '', v_user_id);
  END IF;
END $$;
