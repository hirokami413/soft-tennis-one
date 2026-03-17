-- =============================================
-- RPC: コーチの回答数を安全にインクリメント
-- SECURITY DEFINERでRLSをバイパス
-- =============================================

CREATE OR REPLACE FUNCTION increment_coach_answer_count(p_coach_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE profiles
  SET coach_answer_count = coach_answer_count + 1
  WHERE id = p_coach_id;
END;
$$;
