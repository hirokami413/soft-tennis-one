-- =============================================
-- coach_questions に報告関連カラムを追加
-- =============================================

ALTER TABLE coach_questions ADD COLUMN IF NOT EXISTS reported BOOLEAN DEFAULT false;
ALTER TABLE coach_questions ADD COLUMN IF NOT EXISTS report_reason TEXT;
ALTER TABLE coach_questions ADD COLUMN IF NOT EXISTS reported_at TIMESTAMPTZ;
ALTER TABLE coach_questions ADD COLUMN IF NOT EXISTS reported_by UUID REFERENCES profiles(id);

-- =============================================
-- profiles に警告カウントカラムを追加
-- =============================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS warning_count INTEGER DEFAULT 0;

-- =============================================
-- admin用RPC: ユーザーに警告を与える
-- =============================================

CREATE OR REPLACE FUNCTION admin_warn_user(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE profiles
  SET warning_count = warning_count + 1
  WHERE id = p_user_id;
END;
$$;

-- =============================================
-- admin用RPC: ユーザーをBANする
-- =============================================

CREATE OR REPLACE FUNCTION admin_ban_user(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE profiles
  SET system_role = 'banned'
  WHERE id = p_user_id;
END;
$$;

-- =============================================
-- admin用RPC: 報告された回答を削除して再振分
-- =============================================

CREATE OR REPLACE FUNCTION admin_clear_answer(p_question_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE coach_questions
  SET answer = NULL,
      answered_by = NULL,
      answered_at = NULL,
      status = 'waiting',
      reported = false,
      report_reason = NULL,
      reported_at = NULL,
      reported_by = NULL
  WHERE id = p_question_id;
END;
$$;

-- =============================================
-- admin用RPC: 報告を却下
-- =============================================

CREATE OR REPLACE FUNCTION admin_dismiss_report(p_question_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE coach_questions
  SET reported = false,
      report_reason = NULL,
      reported_at = NULL,
      reported_by = NULL
  WHERE id = p_question_id;
END;
$$;
