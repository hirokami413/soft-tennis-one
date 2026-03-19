-- coach_questions に画像・動画のメディア添付カラムを追加
ALTER TABLE coach_questions ADD COLUMN IF NOT EXISTS media JSONB;

-- coach_answers にも画像・動画のメディア添付カラムを追加
ALTER TABLE coach_answers ADD COLUMN IF NOT EXISTS media JSONB;
