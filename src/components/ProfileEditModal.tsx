import React, { useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { X, Edit3, Camera, Loader2 } from 'lucide-react';
import { uploadFile, generateFilePath } from '../lib/storage';

const AVATAR_EMOJIS = [
  '🎾', '🏸', '⭐', '🔥', '💪', '🌟', '🎯', '🏆',
  '🐱', '🐶', '🐻', '🦊', '🐰', '🐸', '🦁', '🐧',
  '🌸', '🍀', '🌊', '⚡', '🎵', '🚀', '💎', '🎪',
];

const MAX_AVATAR_SIZE = 2 * 1024 * 1024; // 2MB

interface ProfileEditModalProps {
  onClose: () => void;
}

export const ProfileEditModal: React.FC<ProfileEditModalProps> = ({ onClose }) => {
  const { user, updateProfile } = useAuth();
  const [nickname, setNickname] = useState(user?.nickname || '');
  const [avatar, setAvatar] = useState(user?.avatarEmoji || '🎾');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (file: File) => {
    if (!user) return;
    if (file.size > MAX_AVATAR_SIZE) {
      alert(`ファイルサイズが大きすぎます。2MB以下の画像を選択してください。\n現在のサイズ: ${(file.size / 1024 / 1024).toFixed(1)}MB`);
      return;
    }
    setUploading(true);
    const path = generateFilePath(user.id, 'avatars', file.name);
    const { url, error } = await uploadFile('profile-avatars', path, file);
    if (error) {
      alert('アップロードに失敗しました: ' + error);
    } else if (url) {
      setAvatarUrl(url);
    }
    setUploading(false);
  };

  const handleSave = () => {
    if (!nickname.trim()) return;
    updateProfile({ nickname: nickname.trim(), avatarEmoji: avatar, avatarUrl: avatarUrl || undefined });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-200" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Edit3 size={16} className="text-brand-blue" />
            プロフィール編集
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Avatar */}
          <div className="space-y-3">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300 block">アバター</label>
            <div className="flex justify-center mb-2">
              <div className="relative group">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="avatar" className="w-20 h-20 rounded-full object-cover border-4 border-white dark:border-slate-700 shadow-lg" />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900 dark:to-indigo-900 flex items-center justify-center text-3xl border-4 border-white dark:border-slate-700 shadow-inner">
                    {avatar}
                  </div>
                )}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 w-8 h-8 bg-brand-blue text-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform border-2 border-white"
                >
                  {uploading ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) handleImageUpload(file);
                    e.target.value = '';
                  }}
                />
              </div>
            </div>
            {avatarUrl && (
              <button
                onClick={() => setAvatarUrl('')}
                className="w-full text-xs text-slate-400 hover:text-red-500 transition-colors"
              >
                カスタム画像を削除して絵文字に戻す
              </button>
            )}
            {!avatarUrl && (
              <div className="grid grid-cols-8 gap-1.5">
                {AVATAR_EMOJIS.map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => setAvatar(emoji)}
                    className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg transition-all ${
                      avatar === emoji
                        ? 'bg-blue-100 dark:bg-blue-900 border-2 border-brand-blue scale-110'
                        : 'bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Nickname */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300 block">ニックネーム</label>
            <input
              type="text"
              value={nickname}
              onChange={e => setNickname(e.target.value)}
              placeholder="例: テニス太郎"
              maxLength={20}
              className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 text-sm dark:text-slate-100 focus:outline-none focus:border-brand-blue"
            />
          </div>

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={!nickname.trim() || uploading}
            className="w-full py-3 bg-brand-blue text-white rounded-xl font-bold text-sm disabled:opacity-40 hover:bg-brand-blue-hover transition-all"
          >
            {uploading ? 'アップロード中...' : '保存する'}
          </button>
        </div>
      </div>
    </div>
  );
};
