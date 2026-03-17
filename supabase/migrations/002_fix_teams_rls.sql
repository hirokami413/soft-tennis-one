-- teams / team_members のRLSポリシー修正パッチ
-- team_members のSELECTポリシーが自己参照で無限再帰するため修正

-- 既存ポリシーを削除
DROP POLICY IF EXISTS "チーム: メンバーのみ閲覧可能" ON teams;
DROP POLICY IF EXISTS "チームメンバー: チームメンバーのみ閲覧可能" ON team_members;

-- team_members: 自分が参加しているレコードのみ閲覧可能（再帰なし）
CREATE POLICY "チームメンバー: 自分の所属を閲覧可能"
  ON team_members FOR SELECT
  USING (auth.uid() = user_id);

-- teams: team_membersの自身レコードを直接参照（再帰なし）
CREATE POLICY "チーム: メンバーのみ閲覧可能"
  ON teams FOR SELECT
  USING (
    id IN (
      SELECT team_id FROM team_members
      WHERE user_id = auth.uid()
    )
  );
