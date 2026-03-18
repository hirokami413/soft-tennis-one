-- tennis_notesテーブルにcoin_grantedフラグを追加
-- 公開ノート削除→再公開でのコイン不正取得を防止
ALTER TABLE tennis_notes ADD COLUMN IF NOT EXISTS coin_granted boolean DEFAULT false;

-- 既に公開済みのノートにはcoin_grantedをtrueに設定
UPDATE tennis_notes SET coin_granted = true WHERE published = true;
