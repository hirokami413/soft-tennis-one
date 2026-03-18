-- tennis_notesテーブルにmedia (JSONB) カラムを追加
-- 画像・動画・URLの添付情報を保存する
ALTER TABLE tennis_notes
ADD COLUMN IF NOT EXISTS media JSONB DEFAULT NULL;
