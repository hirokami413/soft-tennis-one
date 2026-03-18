-- coach_advices テーブル: コーチが生徒のノートに対して送るアドバイス
CREATE TABLE IF NOT EXISTS coach_advices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID NOT NULL REFERENCES tennis_notes(id) ON DELETE CASCADE,
  coach_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  media JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_coach_advices_note ON coach_advices(note_id);
CREATE INDEX idx_coach_advices_student ON coach_advices(student_id);

ALTER TABLE coach_advices ENABLE ROW LEVEL SECURITY;

-- コーチ/管理者はアドバイスを作成可能
CREATE POLICY "Coaches insert advice"
ON coach_advices FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND system_role IN ('coach', 'admin'))
);

-- 関連する生徒とコーチはアドバイスを閲覧可能
CREATE POLICY "Students and coaches view advice"
ON coach_advices FOR SELECT TO authenticated
USING (
  auth.uid() = student_id
  OR auth.uid() = coach_id
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND system_role = 'admin')
);

-- tennis_notes に coach_reviewed フラグ追加
ALTER TABLE tennis_notes
ADD COLUMN IF NOT EXISTS coach_reviewed BOOLEAN DEFAULT false;
