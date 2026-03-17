-- =============================================
-- RPC: コーチのランクを安全に更新
-- SECURITY DEFINERでRLSをバイパス
-- ランクアップは生徒がresolveした時にフロントから呼ばれる
-- =============================================

CREATE OR REPLACE FUNCTION update_coach_rank(p_coach_id UUID, p_new_rank TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE profiles
  SET coach_rank = p_new_rank
  WHERE id = p_coach_id;
END;
$$;
