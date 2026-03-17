import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { X, Edit3, ShieldAlert } from 'lucide-react';

const AVATAR_EMOJIS = [
  '🎾', '🏸', '⭐', '🔥', '💪', '🌟', '🎯', '🏆',
  '🐱', '🐶', '🐻', '🦊', '🐰', '🐸', '🦁', '🐧',
  '🌸', '🍀', '🌊', '⚡', '🎵', '🚀', '💎', '🎪',
];

interface ProfileEditModalProps {
  onClose: () => void;
}

export const ProfileEditModal: React.FC<ProfileEditModalProps> = ({ onClose }) => {
  const { user, updateProfile } = useAuth();
  const [nickname, setNickname] = useState(user?.nickname || '');
  const [avatar, setAvatar] = useState(user?.avatarEmoji || '🎾');

  const handleSave = () => {
    if (!nickname.trim()) return;
    updateProfile({ nickname: nickname.trim(), avatarEmoji: avatar });
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
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900 dark:to-indigo-900 flex items-center justify-center text-3xl border-4 border-white dark:border-slate-700 shadow-inner">
                {avatar}
              </div>
            </div>
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

          {/* Debug: Admin Role Toggle */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-bold">現在の権限: {user?.systemRole}</span>
              {user?.systemRole !== 'admin' && (
                <button
                  onClick={async () => {
                    if (!user) return;
                    await supabase.from('profiles').update({ system_role: 'admin' }).eq('id', user.id);
                    alert('管理者権限を付与しました！ページをリロードして反映させます。');
                    window.location.reload();
                  }}
                  className="text-[10px] bg-red-100 text-red-600 px-2 py-1 rounded-md font-bold flex items-center gap-1 hover:bg-red-200 transition-colors"
                >
                  <ShieldAlert size={12} />
                  管理者になる(テスト)
                </button>
              )}
            </div>
          </div>

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={!nickname.trim()}
            className="w-full py-3 bg-brand-blue text-white rounded-xl font-bold text-sm disabled:opacity-40 hover:bg-brand-blue-hover transition-all"
          >
            保存する
          </button>
        </div>
      </div>
    </div>
  );
};
