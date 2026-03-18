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

  const { data: urlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(path);

  return { url: urlData.publicUrl, error: null };
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
