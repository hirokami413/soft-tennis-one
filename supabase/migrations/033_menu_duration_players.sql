-- menusテーブルに分数・人数カラムを追加
ALTER TABLE menus ADD COLUMN IF NOT EXISTS duration INTEGER DEFAULT NULL;
ALTER TABLE menus ADD COLUMN IF NOT EXISTS min_players INTEGER DEFAULT NULL;
ALTER TABLE menus ADD COLUMN IF NOT EXISTS max_players INTEGER DEFAULT NULL;

-- menu_detailsビューを再作成
DROP VIEW IF EXISTS menu_details;

CREATE VIEW menu_details AS
SELECT 
  m.*,
  p.nickname as author_nickname,
  p.avatar_emoji as author_avatar,
  (SELECT COUNT(*) FROM favorites f WHERE f.menu_id = m.id::TEXT) as favorites_count
FROM menus m
JOIN profiles p ON m.author_id = p.id;
