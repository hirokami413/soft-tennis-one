-- =============================================
-- コーチ応募テーブルに詳細情報カラムを追加
-- =============================================

ALTER TABLE coach_applications
ADD COLUMN IF NOT EXISTS years_experience TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS certification TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS self_intro TEXT DEFAULT '';
