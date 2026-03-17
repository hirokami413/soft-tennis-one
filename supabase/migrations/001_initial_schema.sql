-- =============================================
-- ソフトテニス One - 初期DBスキーマ
-- Supabase Dashboard の SQL Editor で実行
-- =============================================

-- ── 1. profiles ──
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname TEXT NOT NULL DEFAULT '',
  avatar_emoji TEXT NOT NULL DEFAULT '🎾',
  coins INTEGER NOT NULL DEFAULT 20,
  subscription_plan TEXT NOT NULL DEFAULT 'free'
    CHECK (subscription_plan IN ('free', 'light', 'standard', 'pro')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 2. tennis_notes ──
CREATE TABLE IF NOT EXISTS tennis_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  keep TEXT NOT NULL DEFAULT '',
  problem TEXT NOT NULL DEFAULT '',
  try_item TEXT NOT NULL DEFAULT '',
  coach_question TEXT NOT NULL DEFAULT '',
  other TEXT NOT NULL DEFAULT '',
  skills INTEGER[] NOT NULL DEFAULT '{3,3,3,3,3,3}',
  published BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tennis_notes_user ON tennis_notes(user_id);
CREATE INDEX idx_tennis_notes_published ON tennis_notes(published) WHERE published = TRUE;
CREATE INDEX idx_tennis_notes_date ON tennis_notes(date);

-- ── 3. note_media ──
CREATE TABLE IF NOT EXISTS note_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID NOT NULL REFERENCES tennis_notes(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('image', 'video', 'url')),
  url TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT ''
);

-- ── 4. goals ──
CREATE TABLE IF NOT EXISTS goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'short' CHECK (type IN ('short', 'mid')),
  done BOOLEAN NOT NULL DEFAULT FALSE,
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 5)
);

CREATE INDEX idx_goals_user ON goals(user_id);

-- ── 5. teams ──
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 6. team_members ──
CREATE TABLE IF NOT EXISTS team_members (
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'coach', 'member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (team_id, user_id)
);

-- ── 7. notifications ──
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('coach', 'team', 'note', 'system')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, read) WHERE read = FALSE;

-- ── 8. favorites ──
CREATE TABLE IF NOT EXISTS favorites (
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  menu_id TEXT NOT NULL,
  PRIMARY KEY (user_id, menu_id)
);

-- ── 9. coach_questions ──
CREATE TABLE IF NOT EXISTS coach_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category TEXT NOT NULL DEFAULT '',
  question TEXT NOT NULL,
  answer TEXT,
  answered_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_coach_questions_user ON coach_questions(user_id);

-- =============================================
-- RPC: コインを安全にサーバーサイドで加算
-- =============================================
CREATE OR REPLACE FUNCTION add_coins(p_user_id UUID, p_amount INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_coins INTEGER;
BEGIN
  UPDATE profiles
  SET coins = coins + p_amount
  WHERE id = p_user_id
  RETURNING coins INTO new_coins;
  
  RETURN new_coins;
END;
$$;

-- =============================================
-- Row Level Security (RLS) ポリシー
-- =============================================

-- profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "プロフィール: 自分のデータを閲覧可能"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "プロフィール: 自分のデータを更新可能"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "プロフィール: 新規作成可能"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- tennis_notes
ALTER TABLE tennis_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ノート: 自分のノートを全操作可能"
  ON tennis_notes FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "ノート: 公開ノートは全員閲覧可能"
  ON tennis_notes FOR SELECT
  USING (published = TRUE);

-- note_media
ALTER TABLE note_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "メディア: 自分のノートのメディアを全操作可能"
  ON note_media FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM tennis_notes
      WHERE tennis_notes.id = note_media.note_id
      AND tennis_notes.user_id = auth.uid()
    )
  );

CREATE POLICY "メディア: 公開ノートのメディアは全員閲覧可能"
  ON note_media FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tennis_notes
      WHERE tennis_notes.id = note_media.note_id
      AND tennis_notes.published = TRUE
    )
  );

-- goals
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "目標: 自分の目標を全操作可能"
  ON goals FOR ALL
  USING (auth.uid() = user_id);

-- teams
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "チーム: メンバーのみ閲覧可能"
  ON teams FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = teams.id
      AND team_members.user_id = auth.uid()
    )
  );

CREATE POLICY "チーム: 作成可能"
  ON teams FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- team_members
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "チームメンバー: チームメンバーのみ閲覧可能"
  ON team_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_members AS tm
      WHERE tm.team_id = team_members.team_id
      AND tm.user_id = auth.uid()
    )
  );

CREATE POLICY "チームメンバー: 参加可能"
  ON team_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "通知: 自分の通知を全操作可能"
  ON notifications FOR ALL
  USING (auth.uid() = user_id);

-- favorites
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "お気に入り: 自分のお気に入りを全操作可能"
  ON favorites FOR ALL
  USING (auth.uid() = user_id);

-- coach_questions
ALTER TABLE coach_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "コーチ質問: 自分の質問を全操作可能"
  ON coach_questions FOR ALL
  USING (auth.uid() = user_id);

-- =============================================
-- トリガー: 新規ユーザー作成時にprofileを自動作成
-- =============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, nickname, avatar_emoji, coins)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email, 'ユーザー'),
    '🎾',
    20
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- =============================================
-- Realtime 有効化 (公開ノートのリアルタイム更新)
-- =============================================
ALTER PUBLICATION supabase_realtime ADD TABLE tennis_notes;
