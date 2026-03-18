-- ── note_comments: ノートへのコメント ──
CREATE TABLE IF NOT EXISTS note_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID NOT NULL REFERENCES tennis_notes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_note_comments_note ON note_comments(note_id);
CREATE INDEX idx_note_comments_user ON note_comments(user_id);

-- ── comment_reports: コメント通報 ──
CREATE TABLE IF NOT EXISTS comment_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES note_comments(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(comment_id, reporter_id)
);

CREATE INDEX idx_comment_reports_comment ON comment_reports(comment_id);

-- ── RLS ──
ALTER TABLE note_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_reports ENABLE ROW LEVEL SECURITY;

-- コメント: 誰でも公開ノートのコメントを閲覧可能
CREATE POLICY "Anyone can view comments"
ON note_comments FOR SELECT TO authenticated
USING (true);

-- コメント: ログインユーザーは投稿可能
CREATE POLICY "Users can insert comments"
ON note_comments FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- コメント: 自分のコメントのみ削除可能
CREATE POLICY "Users delete own comments"
ON note_comments FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- 管理者はコメント削除可能
CREATE POLICY "Admins delete any comment"
ON note_comments FOR DELETE TO authenticated
USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND system_role IN ('admin', 'coach'))
);

-- 通報: ログインユーザーは通報可能
CREATE POLICY "Users can report"
ON comment_reports FOR INSERT TO authenticated
WITH CHECK (auth.uid() = reporter_id);

-- 通報: 管理者は全通報を閲覧可能
CREATE POLICY "Admins view reports"
ON comment_reports FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND system_role IN ('admin', 'coach'))
);

-- 通報: 自分の通報も閲覧可能
CREATE POLICY "Users view own reports"
ON comment_reports FOR SELECT TO authenticated
USING (auth.uid() = reporter_id);

-- リアルタイム
ALTER PUBLICATION supabase_realtime ADD TABLE note_comments;
