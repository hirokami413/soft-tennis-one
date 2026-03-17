-- チーム作成時に直後に `.select()` を実行した際、まだ team_members に レコードが無いため RLS違反になるのを防ぐ修正

DROP POLICY IF EXISTS "チーム: メンバーのみ閲覧可能" ON teams;

CREATE POLICY "チーム: メンバーのみ閲覧可能"
  ON teams FOR SELECT
  USING (
    created_by = auth.uid() OR
    id IN (
      SELECT team_id FROM team_members
      WHERE user_id = auth.uid()
    )
  );
