-- coach_answers: 1つの質問に対する複数コーチの回答を保存
CREATE TABLE IF NOT EXISTS coach_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES coach_questions(id) ON DELETE CASCADE,
  coach_id UUID NOT NULL REFERENCES profiles(id),
  answer TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_best_answer BOOLEAN NOT NULL DEFAULT false,
  UNIQUE(question_id, coach_id) -- 同じコーチが同じ質問に2回回答できない
);

-- RLS有効化
ALTER TABLE coach_answers ENABLE ROW LEVEL SECURITY;

-- 全員が回答を閲覧可能
CREATE POLICY "coach_answers_select_all"
  ON coach_answers FOR SELECT
  USING (true);

-- コーチ/adminのみ回答の挿入が可能
CREATE POLICY "coach_answers_insert_coach"
  ON coach_answers FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND system_role IN ('coach', 'admin')
    )
    AND coach_id = auth.uid()
  );

-- 質問者のみベストアンサーの設定(UPDATE)が可能
CREATE POLICY "coach_answers_update_questioner"
  ON coach_answers FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM coach_questions
      WHERE coach_questions.id = coach_answers.question_id
      AND coach_questions.user_id = auth.uid()
    )
  );

-- adminは全操作可能
CREATE POLICY "coach_answers_admin_all"
  ON coach_answers FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND system_role = 'admin'
    )
  );
