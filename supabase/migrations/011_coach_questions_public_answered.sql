-- =============================================
-- coach_questions: 回答済み・解決済みの質問を全認証ユーザーが閲覧可能に
-- これにより相談一覧で他のユーザーの質問＆回答も表示される
-- =============================================

CREATE POLICY "コーチ相談: 回答済み質問は全員閲覧可能"
  ON coach_questions FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND status IN ('answered', 'resolved')
  );
