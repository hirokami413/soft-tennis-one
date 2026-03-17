-- =============================================
-- admin は coach_questions の全レコードを UPDATE/DELETE 可能
-- =============================================

-- admin用のUPDATEポリシー（制限なし）
CREATE POLICY "コーチ相談: 管理者は全て更新可能"
  ON coach_questions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND system_role = 'admin'
    )
  );

-- admin用のDELETEポリシー
CREATE POLICY "コーチ相談: 管理者は削除可能"
  ON coach_questions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND system_role = 'admin'
    )
  );
