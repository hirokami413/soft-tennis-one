-- =============================================
-- ソフトテニス One - 第4フェーズ追加テーブル
-- Supabase Dashboard の SQL Editor で実行
-- =============================================

-- ── 1. team_events テーブル (チーム予定) ──
CREATE TABLE IF NOT EXISTS team_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  event_date DATE NOT NULL,
  event_time TEXT,
  location TEXT,
  needs_attendance BOOLEAN DEFAULT false,
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 2. event_attendances テーブル (出欠確認) ──
CREATE TABLE IF NOT EXISTS event_attendances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES team_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late', 'undecided')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_id)
);

-- ── 3. team_chats テーブル (チームチャット) ──
CREATE TABLE IF NOT EXISTS team_chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  target_id TEXT NOT NULL DEFAULT 'all', -- 'all' または グループ/個人ID (拡張用)
  text TEXT NOT NULL,
  attachments JSONB DEFAULT '[]', -- [{name, type, url, size}]
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 4. team_board_posts テーブル (掲示板) ──
CREATE TABLE IF NOT EXISTS team_board_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  attachments JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 5. board_comments テーブル (掲示板コメント) ──
CREATE TABLE IF NOT EXISTS temp_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL, -- event_id または board_post_id に紐づく
  parent_type TEXT NOT NULL CHECK (parent_type IN ('event', 'board')),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 6. coach_chat_history テーブル (AIコーチ相談履歴) ──
CREATE TABLE IF NOT EXISTS coach_chat_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  coach_id TEXT NOT NULL, -- 選択したコーチのID（"takahashi", "watanabe" など）
  sender_type TEXT NOT NULL CHECK (sender_type IN ('user', 'coach')),
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- RLS (Row Level Security) 設定
-- ※すべて、ログインユーザーが「自分が所属しているチーム」または「自分自身のデータ」にのみアクセス可能にするためのルール
-- =============================================

ALTER TABLE team_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_attendances ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_board_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE temp_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_chat_history ENABLE ROW LEVEL SECURITY;

-- team_events
CREATE POLICY "team_events select" ON team_events FOR SELECT USING (EXISTS (SELECT 1 FROM team_members WHERE team_id = team_events.team_id AND user_id = auth.uid()));
CREATE POLICY "team_events insert" ON team_events FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM team_members WHERE team_id = team_events.team_id AND user_id = auth.uid()));
CREATE POLICY "team_events delete" ON team_events FOR DELETE USING (author_id = auth.uid());

-- event_attendances
CREATE POLICY "event_attendances select" ON event_attendances FOR SELECT USING (EXISTS (SELECT 1 FROM team_events e JOIN team_members m ON e.team_id = m.team_id WHERE e.id = event_attendances.event_id AND m.user_id = auth.uid()));
CREATE POLICY "event_attendances insert_update" ON event_attendances FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- team_chats
CREATE POLICY "team_chats select" ON team_chats FOR SELECT USING (EXISTS (SELECT 1 FROM team_members WHERE team_id = team_chats.team_id AND user_id = auth.uid()));
CREATE POLICY "team_chats insert" ON team_chats FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM team_members WHERE team_id = team_chats.team_id AND user_id = auth.uid()));

-- team_board_posts
CREATE POLICY "team_board_posts select" ON team_board_posts FOR SELECT USING (EXISTS (SELECT 1 FROM team_members WHERE team_id = team_board_posts.team_id AND user_id = auth.uid()));
CREATE POLICY "team_board_posts insert" ON team_board_posts FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM team_members WHERE team_id = team_board_posts.team_id AND user_id = auth.uid()));

-- temp_comments (event/board コメント)
CREATE POLICY "temp_comments select" ON temp_comments FOR SELECT USING (true); -- 簡略化のため全員閲覧可（投稿自体は親への参照時に制御）
CREATE POLICY "temp_comments insert" ON temp_comments FOR INSERT WITH CHECK (user_id = auth.uid());

-- coach_chat_history
CREATE POLICY "coach_chats select" ON coach_chat_history FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "coach_chats insert" ON coach_chat_history FOR INSERT WITH CHECK (user_id = auth.uid());
