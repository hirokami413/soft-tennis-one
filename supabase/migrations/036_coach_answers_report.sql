-- coach_answers に報告関連カラムを追加
ALTER TABLE coach_answers ADD COLUMN IF NOT EXISTS reported BOOLEAN DEFAULT false;
ALTER TABLE coach_answers ADD COLUMN IF NOT EXISTS report_reason TEXT;
ALTER TABLE coach_answers ADD COLUMN IF NOT EXISTS reported_at TIMESTAMPTZ;
ALTER TABLE coach_answers ADD COLUMN IF NOT EXISTS reported_by UUID REFERENCES profiles(id);
