-- coach_questions に画像・動画のメディア添付カラムを追加
ALTER TABLE coach_questions ADD COLUMN IF NOT EXISTS media JSONB;
