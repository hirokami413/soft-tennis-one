import { supabase } from './supabase';

/**
 * Supabase Storageにファイルをアップロードし、公開URLを返す
 */
export async function uploadFile(
  bucket: string,
  path: string,
  file: File
): Promise<{ url: string | null; error: string | null }> {
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { upsert: true });

  if (error) {
    console.error('Upload error:', error);
    return { url: null, error: error.message };
  }

  // 非公開バケットの場合はsigned URLを使用（1時間有効）
  // アプリケーション表示時に毎回取得し直すので問題ない
  const { data: urlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(path);

  return { url: urlData.publicUrl, error: null };
}

/**
 * 非公開バケットのファイルのSigned URL（期限付きアクセスURL）を取得
 */
export async function getSignedUrl(
  bucket: string,
  path: string,
  expiresIn: number = 3600
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);

  if (error) {
    console.error('Signed URL error:', error);
    return null;
  }
  return data.signedUrl;
}

/**
 * Supabase Storageからファイルを削除
 */
export async function deleteFile(
  bucket: string,
  path: string
): Promise<{ error: string | null }> {
  const { error } = await supabase.storage
    .from(bucket)
    .remove([path]);

  if (error) {
    console.error('Delete error:', error);
    return { error: error.message };
  }
  return { error: null };
}

/**
 * ユニークなファイルパスを生成
 */
export function generateFilePath(userId: string, folder: string, fileName: string): string {
  const timestamp = Date.now();
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `${userId}/${folder}/${timestamp}_${safeName}`;
}
