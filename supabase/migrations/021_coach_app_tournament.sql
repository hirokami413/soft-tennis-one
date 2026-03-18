-- coach_applicationsテーブルに大会実績カラムを追加
ALTER TABLE coach_applications
ADD COLUMN IF NOT EXISTS tournament_results TEXT DEFAULT '';
