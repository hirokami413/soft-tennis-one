-- tennis_notesテーブルにsent_to_coach (コーチ送信フラグ) カラムを追加
ALTER TABLE tennis_notes
ADD COLUMN IF NOT EXISTS sent_to_coach BOOLEAN DEFAULT false;

-- インデックス追加
CREATE INDEX IF NOT EXISTS idx_tennis_notes_sent_to_coach ON tennis_notes(sent_to_coach) WHERE sent_to_coach = true;
