-- menusテーブルにサムネイル画像URLカラムを追加
ALTER TABLE menus ADD COLUMN IF NOT EXISTS image_url TEXT NOT NULL DEFAULT '';

-- menu_detailsビューを再作成してimage_urlを含める
-- （m.* で全カラムを取得しているため、カラム追加後にビューを再作成する必要がある）
DROP VIEW IF EXISTS menu_details;

CREATE VIEW menu_details AS
SELECT 
  m.*,
  p.nickname as author_nickname,
  p.avatar_emoji as author_avatar,
  (SELECT COUNT(*) FROM favorites f WHERE f.menu_id = m.id::TEXT) as favorites_count
FROM menus m
JOIN profiles p ON m.author_id = p.id;
