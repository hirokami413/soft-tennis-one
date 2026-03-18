-- =============================================
-- Supabase Storage バケット＆coach_applications追加カラム
-- =============================================

-- 1. coach_applications に URL カラム追加
ALTER TABLE coach_applications
ADD COLUMN IF NOT EXISTS id_document_url TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS resume_url TEXT DEFAULT '';

-- 2. Storage バケット作成（Supabase ダッシュボードから手動で作成することも可能）
-- 以下をSupabase SQL Editorで実行:

-- coach-docs バケット
INSERT INTO storage.buckets (id, name, public)
VALUES ('coach-docs', 'coach-docs', false)
ON CONFLICT (id) DO NOTHING;

-- note-media バケット（画像・動画は公開表示するため public）
INSERT INTO storage.buckets (id, name, public)
VALUES ('note-media', 'note-media', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Storage RLS ポリシー

-- coach-docs: 本人がアップロード可能
CREATE POLICY "coach_docs_insert" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'coach-docs' AND auth.uid()::text = (storage.foldername(name))[1]);

-- coach-docs: admin と本人が閲覧可能
CREATE POLICY "coach_docs_select" ON storage.objects FOR SELECT
  USING (
    bucket_id = 'coach-docs' AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND system_role = 'admin')
    )
  );

-- note-media: 認証ユーザーがアップロード可能（自分のフォルダのみ）
CREATE POLICY "note_media_insert" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'note-media' AND auth.uid()::text = (storage.foldername(name))[1]);

-- note-media: 公開バケットなのでSELECTは全員可能
CREATE POLICY "note_media_select" ON storage.objects FOR SELECT
  USING (bucket_id = 'note-media');

-- note-media: 本人が削除可能
CREATE POLICY "note_media_delete" ON storage.objects FOR DELETE
  USING (bucket_id = 'note-media' AND auth.uid()::text = (storage.foldername(name))[1]);

-- coach-docs: 本人が削除可能
CREATE POLICY "coach_docs_delete" ON storage.objects FOR DELETE
  USING (bucket_id = 'coach-docs' AND auth.uid()::text = (storage.foldername(name))[1]);
