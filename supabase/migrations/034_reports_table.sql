-- reportsテーブルを作成（やってみたレポート）
CREATE TABLE IF NOT EXISTS reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  menu_id UUID NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLSを有効化
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- 全員が閲覧可能
CREATE POLICY "reports_select_all" ON reports FOR SELECT USING (true);

-- ログインユーザーが投稿可能
CREATE POLICY "reports_insert_auth" ON reports FOR INSERT
WITH CHECK (auth.uid() = author_id);

-- 投稿者だけが削除可能
CREATE POLICY "reports_delete_own" ON reports FOR DELETE
USING (auth.uid() = author_id);

-- 管理者は全て削除可能
CREATE POLICY "reports_delete_admin" ON reports FOR DELETE
USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
