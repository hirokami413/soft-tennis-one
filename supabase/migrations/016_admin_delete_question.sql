-- =============================================
-- admin用RPC: 質問を完全に削除
-- =============================================

CREATE OR REPLACE FUNCTION admin_delete_question(p_question_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM coach_questions WHERE id = p_question_id;
END;
$$;
