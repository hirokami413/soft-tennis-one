-- =============================================
-- coach_questions: adminも回答（UPDATE）可能にする
-- 既存ポリシー「コーチ相談: コーチの回答」は system_role = 'coach' のみ許可
-- adminも回答できるように修正
-- =============================================

DROP POLICY IF EXISTS "コーチ相談: コーチの回答" ON coach_questions;

CREATE POLICY "コーチ相談: コーチの回答"
  ON coach_questions FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND system_role IN ('coach', 'admin'))
    AND (answered_by IS NULL OR answered_by = auth.uid())
  );
