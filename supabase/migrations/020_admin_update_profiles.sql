-- admin が他ユーザーのプロフィールを更新できるポリシーを追加
-- (コーチ承認時に system_role を変更するために必要)
CREATE POLICY "profiles_admin_update"
  ON profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND system_role = 'admin'
    )
  );
