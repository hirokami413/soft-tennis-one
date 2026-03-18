-- 管理者が他ユーザーに通知を送信できるようにする
-- （コーチ採用通知、テニスノート返信通知等）
CREATE POLICY "通知: 管理者は全ユーザーに通知を送信可能"
  ON notifications FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND system_role = 'admin')
  );
