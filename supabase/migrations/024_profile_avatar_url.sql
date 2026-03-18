-- profilesテーブルにavatar_url (プロフィール画像URL) カラムを追加
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS avatar_url TEXT DEFAULT NULL;

-- profile-avatarsバケット作成
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-avatars', 'profile-avatars', true)
ON CONFLICT (id) DO NOTHING;

-- ユーザーは自分のフォルダにのみアップロード可能
CREATE POLICY "Users upload own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profile-avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 自分のアバターのみ削除可能
CREATE POLICY "Users delete own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'profile-avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- アバター画像は誰でも閲覧可能（公開バケット）
CREATE POLICY "Anyone can view avatars"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'profile-avatars');
