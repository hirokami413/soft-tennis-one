-- coach_applications: ユーザーが自分の応募を更新できるポリシー追加
-- （再応募時にstatusをpendingに戻すため）
CREATE POLICY "コーチ応募: 自分の応募を更新可能"
  ON coach_applications FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
