-- =============================================
-- コーチ管理システム拡張マイグレーション
-- =============================================

-- 1. profiles テーブルに役割と実績の枠を追加
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS system_role TEXT NOT NULL DEFAULT 'user' CHECK (system_role IN ('user', 'coach', 'admin')),
ADD COLUMN IF NOT EXISTS coach_rank TEXT NOT NULL DEFAULT 'bronze' CHECK (coach_rank IN ('bronze', 'silver', 'gold', 'platinum')),
ADD COLUMN IF NOT EXISTS coach_answer_count INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS coach_avg_rating NUMERIC(3,2) NOT NULL DEFAULT 0.00;

-- 2. coach_applications テーブルを作成
CREATE TABLE IF NOT EXISTS coach_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  nickname TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id) -- 1ユーザー1応募まで（再応募はUPDATE想定）
);

-- RLS設定 (coach_applications)
ALTER TABLE coach_applications ENABLE ROW LEVEL SECURITY;

-- 自分の応募は閲覧可能
CREATE POLICY "コーチ応募: 自分の応募を閲覧可能"
  ON coach_applications FOR SELECT
  USING (user_id = auth.uid());

-- 自分から応募可能
CREATE POLICY "コーチ応募: 自分の応募を作成可能"
  ON coach_applications FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- 管理者は全て閲覧可能
CREATE POLICY "コーチ応募: 管理者は全て閲覧可能"
  ON coach_applications FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND system_role = 'admin'));

-- 管理者は全て更新可能
CREATE POLICY "コーチ応募: 管理者は全て更新可能"
  ON coach_applications FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND system_role = 'admin'));


-- 3. coach_questions テーブルの拡張
-- 既存の質問データを正規のテーブルに移行させるため、不足している情報を追加
ALTER TABLE coach_questions
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'answered', 'resolved', 'reask')),
ADD COLUMN IF NOT EXISTS question_type TEXT NOT NULL DEFAULT 'text' CHECK (question_type IN ('text', 'video')),
ADD COLUMN IF NOT EXISTS user_rating INTEGER CHECK (user_rating BETWEEN 1 AND 5),
ADD COLUMN IF NOT EXISTS answered_at TIMESTAMPTZ;

-- coach_questions のRLSを更新（もし無ければ追加）
-- 通常の質問者は「自分の質問」だけ閲覧できるが、コーチは「待機中(waiting)のすべての質問」および「自分が回答した質問」を閲覧できるようにする。
DROP POLICY IF EXISTS "コーチ相談: コーチと管理者の閲覧" ON coach_questions;
CREATE POLICY "コーチ相談: コーチと管理者の閲覧"
  ON coach_questions FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND system_role IN ('coach', 'admin'))
    AND (status IN ('waiting', 'reask') OR answered_by = auth.uid())
  );

-- コーチは自分が担当する質問に回答(UPDATE)できる
DROP POLICY IF EXISTS "コーチ相談: コーチの回答" ON coach_questions;
CREATE POLICY "コーチ相談: コーチの回答"
  ON coach_questions FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND system_role = 'coach')
    AND (answered_by IS NULL OR answered_by = auth.uid())
  );
