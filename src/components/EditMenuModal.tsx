import React, { useState } from 'react';
import { Send, Hash, X, Youtube } from 'lucide-react';
import { type MenuData } from '../data/dummyData';
import { useSupabaseMenus } from '../hooks/useSupabaseMenus';

interface EditMenuModalProps {
  menu: MenuData;
  onClose: () => void;
}

export const EditMenuModal: React.FC<EditMenuModalProps> = ({ menu, onClose }) => {
  const { updateMenu } = useSupabaseMenus();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  
  const [formData, setFormData] = useState({
    title: menu.title || '',
    category: menu.category || 'フォアハンド',
    level: menu.level || '初級',
    description: menu.description || '',
    tags: menu.tags || [],
    youtubeUrl: menu.youtubeUrl || '',
    instagramUrl: menu.instagramUrl || '',
  });
  
  const [tagInput, setTagInput] = useState('');

  const commitTag = (raw: string) => {
    const cleaned = raw.replace(/^#/, '').trim();
    if (cleaned && !formData.tags.includes(cleaned)) {
      setFormData({ ...formData, tags: [...formData.tags, cleaned] });
    }
    setTagInput('');
  };

  const handleTagInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value.endsWith(' ') || value.endsWith('\u3000')) {
      commitTag(value);
    } else {
      setTagInput(value);
    }
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (tagInput.trim()) commitTag(tagInput);
    }
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
    
    if (tagInput.trim()) commitTag(tagInput);

    try {
      setIsSubmitting(true);
      setSubmitError('');
      await updateMenu(menu.id, formData);
      onClose(); // Successfully updated
    } catch (err: any) {
      console.error('Update error:', err);
      setSubmitError(err.message || '更新に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex flex-col justify-end">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
      
      <div className="relative bg-slate-50 w-full h-[95vh] md:h-[90vh] md:max-w-2xl md:mx-auto rounded-t-3xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-full duration-300">
        
        <div className="w-full bg-white px-4 py-3 border-b border-slate-200 flex items-center justify-between sticky top-0 z-10">
          <div className="w-8" />
          <h2 className="text-lg font-bold text-slate-800">メニューを編集する</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-500">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-24">
          <form onSubmit={handleSubmit} className="space-y-6">
            {submitError && (
              <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm border border-red-100 mb-4 animate-in fade-in">
                {submitError}
              </div>
            )}
            
            {/* Title */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 block">練習メニュー名 <span className="text-red-500">*</span></label>
              <input type="text" required value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue" />
            </div>

            {/* Category & Level */}
            <div className="flex gap-4">
              <div className="flex-1 space-y-2">
                <label className="text-sm font-bold text-slate-700 block">カテゴリ</label>
                <select value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue appearance-none">
                  <option>フォアハンド</option><option>バックハンド</option><option>ボレー</option><option>スマッシュ</option><option>サーブ</option><option>フットワーク</option><option>実戦形式</option><option>その他</option>
                </select>
              </div>
              <div className="flex-1 space-y-2">
                <label className="text-sm font-bold text-slate-700 block">推奨レベル</label>
                <select value={formData.level} onChange={(e) => setFormData({...formData, level: e.target.value})} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue appearance-none">
                  <option>初級</option><option>初級〜中級</option><option>中級</option><option>上級</option><option>全レベル</option>
                </select>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 block">練習の進め方・ポイント <span className="text-red-500">*</span></label>
              <textarea required value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm h-48 resize-none focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue leading-relaxed" />
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 flex items-center gap-1.5"><Hash size={14} className="text-brand-blue" />タグ</label>
              <div className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 flex flex-wrap items-center gap-2 focus-within:border-brand-blue focus-within:ring-1 focus-within:ring-brand-blue min-h-[44px]">
                {formData.tags.map(tag => (
                  <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-brand-blue text-xs font-bold rounded-full">
                    #{tag}
                    <button type="button" onClick={() => removeTag(tag)} className="ml-0.5 w-4 h-4 rounded-full flex items-center justify-center hover:bg-blue-200/50 transition-colors"><X size={10} /></button>
                  </span>
                ))}
                <input type="text" value={tagInput} onChange={handleTagInputChange} onKeyDown={handleTagKeyDown} className="flex-1 min-w-[100px] bg-transparent text-sm outline-none py-1" placeholder="追加..." />
              </div>
            </div>

            {/* YouTube */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 flex items-center gap-1.5"><Youtube size={16} className="text-red-500" />YouTube URL（任意）</label>
              <input type="url" value={formData.youtubeUrl} onChange={(e) => setFormData({...formData, youtubeUrl: e.target.value})} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-blue focus:ring-1 placeholder:text-slate-300" />
            </div>

            {/* Submit */}
            <div className="pt-4 pb-24">
              <button type="submit" disabled={!formData.title || !formData.description || isSubmitting} className="w-full bg-brand-blue text-white rounded-2xl py-4 font-bold disabled:opacity-50 flex justify-center items-center gap-2 transition-all hover:bg-brand-blue-hover">
                {isSubmitting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <> <Send size={18} /> 更新を保存する </>}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
