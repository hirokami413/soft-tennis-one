-- レポートの通報テーブル
CREATE TABLE IF NOT EXISTS report_flags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(report_id, reporter_id)
);

ALTER TABLE report_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "report_flags_select_admin" ON report_flags FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND system_role = 'admin')
);

CREATE POLICY "report_flags_insert_auth" ON report_flags FOR INSERT WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "report_flags_delete_admin" ON report_flags FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND system_role = 'admin')
);

-- reportsテーブルにUPDATEポリシー追加（自分のレポートのみ編集可能）
CREATE POLICY "reports_update_own" ON reports FOR UPDATE
USING (auth.uid() = author_id)
WITH CHECK (auth.uid() = author_id);
