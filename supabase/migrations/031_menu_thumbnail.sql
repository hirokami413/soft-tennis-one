-- menusテーブルにサムネイル画像URLカラムを追加
ALTER TABLE menus
ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT '';

-- menu_detailsビューを再作成してimage_urlを含める
CREATE OR REPLACE VIEW menu_details AS
SELECT
  m.*,
  p.nickname AS author_nickname,
  p.avatar_emoji AS author_avatar,
  COALESCE(f.cnt, 0) AS favorites_count
FROM menus m
LEFT JOIN profiles p ON m.author_id = p.id
LEFT JOIN (
  SELECT menu_id, COUNT(*) AS cnt
  FROM favorites
  GROUP BY menu_id
) f ON m.id = f.menu_id;
