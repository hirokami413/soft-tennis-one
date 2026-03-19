import React, { useState } from 'react';
import { Send, Info, CheckCircle2, Hash, X, Youtube, ImageIcon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useSupabaseMenus } from '../hooks/useSupabaseMenus';
import { uploadFile, generateFilePath } from '../lib/storage';
import { compressImage } from '../lib/imageCompress';

export const SubmitView: React.FC = () => {
  const { user } = useAuth();
  const { submitMenu } = useSupabaseMenus();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const defaultForm = {
    title: '',
    category: 'フォアハンド',
    level: '初級',
    description: '',
    tags: [] as string[],
    youtubeUrl: '',
    instagramUrl: '',
    duration: '' as string | number,
    minPlayers: '' as string | number,
    maxPlayers: '' as string | number,
  };
  const [formData, setFormData] = useState(defaultForm);
  const [tagInput, setTagInput] = useState('');
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);

  // タグ入力欄から確定する処理
  const commitTag = (raw: string) => {
    // # を除去し、空白をトリム
    const cleaned = raw.replace(/^#/, '').trim();
    if (cleaned && !formData.tags.includes(cleaned)) {
      setFormData({ ...formData, tags: [...formData.tags, cleaned] });
    }
    setTagInput('');
  };

  const handleTagInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // スペースまたは全角スペースが入力されたらタグを確定
    if (value.endsWith(' ') || value.endsWith('\u3000')) {
      commitTag(value);
    } else {
      setTagInput(value);
    }
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (tagInput.trim()) {
        commitTag(tagInput);
      }
    }
    // Backspace で入力が空なら最後のタグを削除
    if (e.key === 'Backspace' && tagInput === '' && formData.tags.length > 0) {
      setFormData({ ...formData, tags: formData.tags.slice(0, -1) });
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData({ ...formData, tags: formData.tags.filter(t => t !== tagToRemove) });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.description || isSubmitting) return;
    
    // 入力中のタグがあれば確定
    const finalTags = [...formData.tags];
    if (tagInput.trim()) {
      const cleaned = tagInput.replace(/^#/, '').trim();
      if (cleaned && !finalTags.includes(cleaned)) {
        finalTags.push(cleaned);
      }
    }

    try {
      setIsSubmitting(true);
      setSubmitError('');
      
      let imageUrl = '';
      if (thumbnailFile && user) {
        try {
          const compressed = await compressImage(thumbnailFile);
          const path = generateFilePath(user.id, 'menu-thumbnails', compressed.name);
          const { url, error: uploadError } = await uploadFile('note-media', path, compressed);
          if (uploadError) throw new Error('サムネイルのアップロードに失敗: ' + uploadError);
          imageUrl = url || '';
        } catch (imgErr: any) {
          console.error('Image upload error:', imgErr);
          // 画像アップロード失敗でも投稿は続行
        }
      }

      await submitMenu({
        title: formData.title,
        category: formData.category,
        level: formData.level,
        description: formData.description,
        tags: finalTags,
        youtubeUrl: formData.youtubeUrl,
        instagramUrl: formData.instagramUrl,
        imageUrl: imageUrl || undefined,
        duration: formData.duration ? Number(formData.duration) : undefined,
        minPlayers: formData.minPlayers ? Number(formData.minPlayers) : undefined,
        maxPlayers: formData.maxPlayers ? Number(formData.maxPlayers) : undefined,
      });

      setIsSubmitted(true);
      setFormData(defaultForm);
      setTagInput('');
      setThumbnailFile(null);
      setThumbnailPreview(null);
      localStorage.removeItem('submit_view_form');
      localStorage.removeItem('submit_view_tag_input');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      console.error('Submit error:', err);
      const detail = err?.details || err?.hint || '';
      setSubmitError((err.message || '投稿に失敗しました') + (detail ? `\n${detail}` : ''));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center bg-white rounded-3xl border border-slate-100 shadow-sm mt-8 animate-in zoom-in-95 duration-500">
        <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mb-6">
          <CheckCircle2 size={40} className="text-green-500" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-3">投稿ありがとうございます！</h2>
        <p className="text-slate-600 mb-8 leading-relaxed">
          いただいた練習メニューは、運営チームが内容を確認したのち、ライブラリへ公開させていただきます。
        </p>
        <button 
          onClick={() => {
            setIsSubmitted(false);
          }}
          className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 px-8 rounded-full transition-colors"
        >
          新しく投稿する
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 py-2">
      {/* Header Info */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-xl font-bold text-slate-900 mb-2">メニューを投稿する</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            あなたが普段やっている練習法や、独自の効果的なメニューを教えてください。運営チームが確認後、アプリに掲載されます。
          </p>
        </div>
        <div className="absolute -right-6 -bottom-6 opacity-5">
          <Send size={120} />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-6">
        {submitError && (
          <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm border border-red-100 mb-4 animate-in fade-in">
            {submitError}
          </div>
        )}
        
        {/* Poster info */}
        {user && (
          <div className="flex items-center gap-3 bg-slate-50 px-4 py-3 rounded-xl border border-slate-100">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-xl shadow-inner">
              {user.avatarEmoji}
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">{user.nickname}</p>
              <p className="text-[10px] text-slate-400">として投稿します</p>
            </div>
          </div>
        )}
        {/* Title */}
        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700 block">
            練習メニュー名 <span className="text-red-500">*</span>
          </label>
          <input 
            type="text" 
            required
            value={formData.title}
            onChange={(e) => setFormData({...formData, title: e.target.value})}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue transition-all"
            placeholder="例: V字ボレー・スマッシュ連携"
          />
        </div>

        {/* Thumbnail Upload */}
        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
            <ImageIcon size={14} className="text-brand-blue" />
            サムネイル画像（任意）
          </label>
          {thumbnailPreview ? (
            <div className="relative w-full h-40 rounded-xl overflow-hidden border border-slate-200">
              <img src={thumbnailPreview} alt="preview" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => { setThumbnailFile(null); setThumbnailPreview(null); }}
                className="absolute top-2 right-2 w-7 h-7 bg-black/60 text-white rounded-full flex items-center justify-center hover:bg-black/80"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center w-full h-32 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100 hover:border-slate-300 transition-all">
              <ImageIcon size={28} className="text-slate-400 mb-2" />
              <span className="text-xs text-slate-500 font-medium">タップして画像を選択</span>
              <span className="text-[10px] text-slate-400 mt-0.5">未登録の場合はメニュー名が表示されます</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setThumbnailFile(file);
                    setThumbnailPreview(URL.createObjectURL(file));
                  }
                }}
              />
            </label>
          )}
        </div>

        {/* Category & Level */}
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 block">カテゴリ</label>
            <select 
              value={formData.category}
              onChange={(e) => setFormData({...formData, category: e.target.value})}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue appearance-none transition-all"
            >
              <option>フォアハンド</option>
              <option>バックハンド</option>
              <option>ボレー</option>
              <option>スマッシュ</option>
              <option>サーブ</option>
              <option>フットワーク</option>
              <option>トレーニング</option>
              <option>実戦形式</option>
              <option>その他</option>
            </select>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 block">推奨レベル</label>
            <select 
              value={formData.level}
              onChange={(e) => setFormData({...formData, level: e.target.value})}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue appearance-none transition-all"
            >
              <option>初級</option>
              <option>初級〜中級</option>
              <option>中級</option>
              <option>中級〜上級</option>
              <option>上級</option>
            </select>
          </div>
        </div>

        {/* Duration & Players */}
        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700 block">練習時間・人数</label>
          <div className="flex gap-3">
            <div className="flex-1">
              <input
                type="number"
                min="1"
                value={formData.duration}
                onChange={(e) => setFormData({...formData, duration: e.target.value})}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue transition-all"
                placeholder="時間（分）"
              />
            </div>
            <div className="flex-1">
              <input
                type="number"
                min="1"
                value={formData.minPlayers}
                onChange={(e) => setFormData({...formData, minPlayers: e.target.value})}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue transition-all"
                placeholder="最少人数"
              />
            </div>
            <div className="flex-1">
              <input
                type="number"
                min="1"
                value={formData.maxPlayers}
                onChange={(e) => setFormData({...formData, maxPlayers: e.target.value})}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue transition-all"
                placeholder="最大人数"
              />
            </div>
          </div>
        </div>

        {/* Description & Steps */}
        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700 block">
            練習の進め方・ポイント <span className="text-red-500">*</span>
          </label>
          <textarea 
            required
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm h-32 resize-none focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue transition-all leading-relaxed"
            placeholder="人数、時間、具体的な手順や意識するポイントを自由に記述してください。"
          />
        </div>

        {/* Hashtag Dedicated Input */}
        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
            <Hash size={14} className="text-brand-blue" />
            タグ
          </label>
          <div className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 flex flex-wrap items-center gap-2 focus-within:border-brand-blue focus-within:ring-1 focus-within:ring-brand-blue transition-all min-h-[44px]">
            {formData.tags.map(tag => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-brand-blue text-xs font-bold rounded-full border border-blue-100 animate-in zoom-in-95 duration-200"
              >
                #{tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="ml-0.5 w-4 h-4 rounded-full flex items-center justify-center hover:bg-blue-200/50 transition-colors"
                >
                  <X size={10} />
                </button>
              </span>
            ))}
            <input
              type="text"
              value={tagInput}
              onChange={handleTagInputChange}
              onKeyDown={handleTagKeyDown}
              className="flex-1 min-w-[100px] bg-transparent text-sm outline-none py-1 placeholder:text-slate-400"
              placeholder={formData.tags.length === 0 ? "ボレー強化、前衛 などキーワードを入力" : "タグを追加..."}
            />
          </div>
          <p className="text-[11px] text-slate-400 font-medium">
            タグ名を入力し、スペースまたはEnterで確定できます。# は自動で付きます。× で削除できます。
          </p>
        </div>

        {/* YouTube URL */}
        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
            <Youtube size={16} className="text-red-500" />
            参考YouTube動画URL（任意）
          </label>
          <input
            type="url"
            value={formData.youtubeUrl}
            onChange={(e) => setFormData({...formData, youtubeUrl: e.target.value})}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue transition-all"
            placeholder="https://www.youtube.com/watch?v=..."
          />
        </div>

        {/* Instagram URL */}
        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
            <span className="text-lg leading-none">📸</span>
            Instagram動画URL（任意）
          </label>
          <input
            type="url"
            value={formData.instagramUrl}
            onChange={(e) => setFormData({...formData, instagramUrl: e.target.value})}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue transition-all"
            placeholder="https://www.instagram.com/reel/... or /p/..."
          />
        </div>



        {/* Info Alert */}
        <div className="bg-blue-50/50 p-4 rounded-xl flex gap-3 items-start border border-blue-100">
          <Info size={18} className="text-brand-blue shrink-0 mt-0.5" />
          <p className="text-xs text-slate-600 leading-relaxed">
            投稿されたメニューは審査され、表現の調整やコーチのアドバイスが追記される場合があります。
          </p>
        </div>

        {/* Submit */}
        <button 
          type="submit"
          disabled={!formData.title || !formData.description || isSubmitting}
          className="w-full bg-brand-blue text-white rounded-2xl py-4 font-bold disabled:opacity-50 transition-all flex justify-center items-center gap-2 hover:bg-brand-blue-hover"
        >
          {isSubmitting ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <Send size={18} />
              メニューを投稿する
            </>
          )}
        </button>
      </form>
      
      {/* Spacer */}
      <div className="h-6" />
    </div>
  );
};
