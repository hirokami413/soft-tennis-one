/**
 * 画像圧縮ユーティリティ
 * Canvas APIを使用して画像をリサイズ・圧縮する
 */

const MAX_WIDTH = 1200;
const MAX_HEIGHT = 1200;
const QUALITY = 0.8;

/**
 * 画像ファイルを圧縮してBlobを返す
 * - 最大辺1200pxにリサイズ
 * - JPEG品質80%で圧縮
 * - 元のサイズが小さい場合はリサイズしない
 */
export function compressImage(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    // 画像ファイルでない場合はそのまま返す
    if (!file.type.startsWith('image/')) {
      resolve(file);
      return;
    }

    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    img.onload = () => {
      let { width, height } = img;

      // リサイズ計算
      if (width > MAX_WIDTH || height > MAX_HEIGHT) {
        const ratio = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      canvas.width = width;
      canvas.height = height;
      ctx?.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            // 圧縮後のファイルを作成（ファイル名はそのまま、拡張子をjpgに）
            const compressedName = file.name.replace(/\.[^.]+$/, '.jpg');
            const compressedFile = new File([blob], compressedName, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          } else {
            resolve(file); // 圧縮失敗時はそのまま
          }
        },
        'image/jpeg',
        QUALITY
      );

      URL.revokeObjectURL(img.src);
    };

    img.onerror = () => {
      reject(new Error('画像の読み込みに失敗しました'));
    };

    img.src = URL.createObjectURL(file);
  });
}
