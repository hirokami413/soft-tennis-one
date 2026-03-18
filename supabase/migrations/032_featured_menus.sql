-- menusテーブルに「一押し」フラグを追加
ALTER TABLE menus ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT FALSE;

-- menu_detailsビューを再作成してis_featuredを含める
DROP VIEW IF EXISTS menu_details;

CREATE VIEW menu_details AS
SELECT 
  m.*,
  p.nickname as author_nickname,
  p.avatar_emoji as author_avatar,
  (SELECT COUNT(*) FROM favorites f WHERE f.menu_id = m.id::TEXT) as favorites_count
FROM menus m
JOIN profiles p ON m.author_id = p.id;
