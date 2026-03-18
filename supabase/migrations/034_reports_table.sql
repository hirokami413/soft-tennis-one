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

-- 投稿者または管理者が削除可能
CREATE POLICY "reports_delete" ON reports FOR DELETE
USING (
  auth.uid() = author_id
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND system_role = 'admin')
);
