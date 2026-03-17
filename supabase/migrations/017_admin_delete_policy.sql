-- =============================================
-- admin が coach_questions を DELETE できるポリシー
-- =============================================

CREATE POLICY "コーチ相談: 管理者は削除可能"
  ON coach_questions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND system_role = 'admin'
    )
  );
